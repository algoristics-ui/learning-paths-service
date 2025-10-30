import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';
import { LearningPath } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    const { searchParams } = new URL(req.url);
    
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    logger.info(`Fetching learning paths: userId=${user.userId}, organizationId=${user.organizationId}, filters=${JSON.stringify({ status, category, difficulty, page, limit })}`);

    // Build dynamic query with filters
    let whereConditions = ['lp.organization_id = $1'];
    let queryParams: any[] = [user.organizationId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`ue.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`lp.category = $${paramCount}`);
      queryParams.push(category);
    }

    if (difficulty) {
      paramCount++;
      whereConditions.push(`lp.difficulty = $${paramCount}`);
      queryParams.push(difficulty);
    }

    const whereClause = whereConditions.join(' AND ');

    // Main query to get learning paths with user enrollment status
    const pathsQuery = `
      SELECT 
        lp.*,
        COALESCE(ue.status, 'not_started') as user_status,
        COALESCE(ue.progress, 0) as user_progress,
        COALESCE(ue.completed_courses, 0) as user_completed_courses,
        COALESCE(ue.enrolled_at, NULL) as enrolled_at,
        COALESCE(ue.last_activity, NULL) as last_activity
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $${paramCount + 1}
      WHERE ${whereClause}
      ORDER BY lp.created_at DESC
      LIMIT $${paramCount + 2} OFFSET $${paramCount + 3}
    `;

    queryParams.push(user.userId, limit, offset);

    const pathsResult = await query<any>(pathsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $${paramCount + 1}
      WHERE ${whereClause}
    `;

    const countParams = [...queryParams.slice(0, -2), user.userId];
    const countResult = await query<{ total: string }>(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Format the response data
    const paths: LearningPath[] = await Promise.all(
      pathsResult.rows.map(async (row) => {
        // Get milestones and courses for each path
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
          GROUP BY m.id, m.title, m.path_id, m.order_index
          ORDER BY m.order_index
        `, [row.id, user.userId]);

        const milestones = milestonesResult.rows.map(m => ({
          id: m.id,
          title: m.title,
          pathId: m.path_id,
          orderIndex: m.order_index,
          courses: m.courses || []
        }));

        // Calculate next milestone
        const nextMilestone = milestones.find(m => 
          m.courses.some((c: any) => c.status === 'available' || c.status === 'in_progress')
        )?.title || null;

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          difficulty: row.difficulty,
          estimatedTime: row.estimated_time,
          totalCourses: row.total_courses,
          completedCourses: row.user_completed_courses,
          status: row.user_status,
          progress: row.user_progress,
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
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    logger.info(`Learning paths fetched successfully: userId=${user.userId}, pathsCount=${paths.length}, total=${total}, page=${page}, totalPages=${totalPages}`);

    return NextResponse.json({
      success: true,
      data: {
        paths,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    });

  } catch (error: any) {
    logger.error(`Error fetching learning paths: ${error.message}`);
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch learning paths' } },
      { status: 500 }
    );
  }
}