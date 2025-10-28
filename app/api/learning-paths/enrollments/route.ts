import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';
import { UserEnrollment } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    logger.info('Fetching user enrollments', { 
      userId: user.userId, 
      organizationId: user.organizationId,
      statusFilter: status
    });

    // Build query with optional status filter
    let whereCondition = 'ue.user_id = $1 AND lp.organization_id = $2';
    let queryParams: any[] = [user.userId, user.organizationId];

    if (status) {
      whereCondition += ' AND ue.status = $3';
      queryParams.push(status);
    }

    const enrollmentsQuery = `
      SELECT 
        ue.path_id,
        ue.enrolled_at,
        ue.last_activity,
        ue.status as enrollment_status,
        ue.progress,
        lp.*
      FROM user_enrollments ue
      JOIN learning_paths lp ON ue.path_id = lp.id
      WHERE ${whereCondition}
      ORDER BY ue.last_activity DESC
    `;

    const enrollmentsResult = await query<any>(enrollmentsQuery, queryParams);

    const enrollments: UserEnrollment[] = await Promise.all(
      enrollmentsResult.rows.map(async (row) => {
        // Get current course information
        const currentCourseQuery = `
          SELECT c.id, c.title, m.title as milestone_title
          FROM user_course_progress ucp
          JOIN courses c ON ucp.course_id = c.id
          JOIN milestones m ON c.milestone_id = m.id
          WHERE ucp.user_id = $1 
            AND m.path_id = $2 
            AND ucp.status = 'in_progress'
          ORDER BY m.order_index, c.order_index
          LIMIT 1
        `;

        const currentCourseResult = await query<{
          id: number;
          title: string;
          milestone_title: string;
        }>(currentCourseQuery, [user.userId, row.path_id]);

        const currentCourse = currentCourseResult.rows[0] ? {
          id: currentCourseResult.rows[0].id,
          title: currentCourseResult.rows[0].title,
          milestone: currentCourseResult.rows[0].milestone_title
        } : undefined;

        // Get milestones for the path (simplified for enrollment list)
        const milestonesResult = await query(`
          SELECT 
            m.*,
            json_agg(
              json_build_object(
                'id', c.id,
                'title', c.title,
                'duration', c.duration,
                'status', COALESCE(ucp.status, 'locked'),
                'orderIndex', c.order_index
              ) ORDER BY c.order_index
            ) as courses
          FROM milestones m
          LEFT JOIN courses c ON m.id = c.milestone_id
          LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
          WHERE m.path_id = $1
          GROUP BY m.id
          ORDER BY m.order_index
        `, [row.path_id, user.userId]);

        const milestones = milestonesResult.rows.map(m => ({
          id: m.id,
          title: m.title,
          pathId: m.path_id,
          orderIndex: m.order_index,
          courses: m.courses || []
        }));

        const nextMilestone = milestones.find(m => 
          m.courses.some(c => c.status === 'available' || c.status === 'in_progress')
        )?.title || null;

        return {
          pathId: row.path_id,
          path: {
            id: row.id,
            title: row.title,
            description: row.description,
            category: row.category,
            difficulty: row.difficulty,
            estimatedTime: row.estimated_time,
            totalCourses: row.total_courses,
            completedCourses: row.completed_courses || 0,
            status: row.enrollment_status,
            progress: row.progress,
            enrolledStudents: row.enrolled_students,
            rating: parseFloat(row.rating),
            instructor: row.instructor,
            skills: row.skills,
            nextMilestone,
            badges: row.badges,
            milestones,
            organizationId: row.organization_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          },
          enrolledAt: row.enrolled_at,
          lastActivity: row.last_activity,
          currentCourse
        };
      })
    );

    logger.info('User enrollments fetched successfully', { 
      userId: user.userId,
      enrollmentsCount: enrollments.length
    });

    return NextResponse.json({
      success: true,
      data: enrollments
    });

  } catch (error: any) {
    logger.error('Error fetching user enrollments', { error: error.message });
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user enrollments' } },
      { status: 500 }
    );
  }
}