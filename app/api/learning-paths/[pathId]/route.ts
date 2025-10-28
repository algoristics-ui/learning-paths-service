import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';
import { LearningPath } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { pathId: string } }
) {
  try {
    const user = await getUserFromToken(req);
    const pathId = parseInt(params.pathId);

    if (isNaN(pathId)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid path ID' } },
        { status: 400 }
      );
    }

    logger.info('Fetching learning path details', { 
      userId: user.userId, 
      organizationId: user.organizationId,
      pathId 
    });

    // Get learning path with user enrollment status
    const pathQuery = `
      SELECT 
        lp.*,
        COALESCE(ue.status, 'not_started') as user_status,
        COALESCE(ue.progress, 0) as user_progress,
        COALESCE(ue.completed_courses, 0) as user_completed_courses,
        COALESCE(ue.enrolled_at, NULL) as enrolled_at,
        COALESCE(ue.last_activity, NULL) as last_activity
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $2
      WHERE lp.id = $1 AND lp.organization_id = $3
    `;

    const pathResult = await query<any>(pathQuery, [pathId, user.userId, user.organizationId]);

    if (pathResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Learning path not found' } },
        { status: 404 }
      );
    }

    const row = pathResult.rows[0];

    // Get milestones and courses for the path
    const milestonesResult = await query(`
      SELECT 
        m.*,
        json_agg(
          json_build_object(
            'id', c.id,
            'title', c.title,
            'duration', c.duration,
            'status', COALESCE(ucp.status, 'locked'),
            'orderIndex', c.order_index,
            'completedAt', ucp.completed_at
          ) ORDER BY c.order_index
        ) as courses
      FROM milestones m
      LEFT JOIN courses c ON m.id = c.milestone_id
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
      WHERE m.path_id = $1
      GROUP BY m.id, m.title, m.path_id, m.order_index
      ORDER BY m.order_index
    `, [pathId, user.userId]);

    const milestones = milestonesResult.rows.map(m => ({
      id: m.id,
      title: m.title,
      pathId: m.path_id,
      orderIndex: m.order_index,
      courses: m.courses || []
    }));

    // Calculate next milestone
    const nextMilestone = milestones.find(m => 
      m.courses.some(c => c.status === 'available' || c.status === 'in_progress')
    )?.title || null;

    const learningPath: LearningPath = {
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

    logger.info('Learning path details fetched successfully', { 
      userId: user.userId,
      pathId,
      pathTitle: learningPath.title
    });

    return NextResponse.json({
      success: true,
      data: learningPath
    });

  } catch (error: any) {
    logger.error('Error fetching learning path details', { error: error.message, pathId: params.pathId });
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch learning path details' } },
      { status: 500 }
    );
  }
}