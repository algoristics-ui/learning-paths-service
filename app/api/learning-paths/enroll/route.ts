import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    const body = await req.json();
    
    const { pathId } = body;

    if (!pathId || isNaN(parseInt(pathId))) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid pathId is required' } },
        { status: 400 }
      );
    }

    logger.info(`Enrolling user in learning path: userId=${user.userId}, organizationId=${user.organizationId}, pathId=${pathId}`);

    // Check if path exists and belongs to user's organization
    const pathCheckQuery = `
      SELECT id, title FROM learning_paths 
      WHERE id = $1 AND organization_id = $2
    `;
    
    const pathResult = await query<{ id: number; title: string }>(
      pathCheckQuery, 
      [pathId, user.organizationId]
    );

    if (pathResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Learning path not found' } },
        { status: 404 }
      );
    }

    // Check if user is already enrolled
    const existingEnrollmentQuery = `
      SELECT id FROM user_enrollments 
      WHERE user_id = $1 AND path_id = $2
    `;
    
    const existingResult = await query(existingEnrollmentQuery, [user.userId, pathId]);

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_ENROLLED', message: 'User is already enrolled in this learning path' } },
        { status: 409 }
      );
    }

    // Enroll user in the learning path
    const enrollmentQuery = `
      INSERT INTO user_enrollments (user_id, path_id, status, progress, completed_courses, enrolled_at, last_activity)
      VALUES ($1, $2, 'in_progress', 0, 0, NOW(), NOW())
      RETURNING enrolled_at
    `;
    
    const enrollmentResult = await query<{ enrolled_at: string }>(
      enrollmentQuery, 
      [user.userId, pathId]
    );

    // Initialize course progress for the first available course
    const initCourseProgressQuery = `
      INSERT INTO user_course_progress (user_id, course_id, status, started_at, updated_at)
      SELECT $1, c.id, 'available', NOW(), NOW()
      FROM courses c
      JOIN milestones m ON c.milestone_id = m.id
      WHERE m.path_id = $2 AND m.order_index = 1 AND c.order_index = 1
    `;
    
    await query(initCourseProgressQuery, [user.userId, pathId]);

    const enrolledAt = enrollmentResult.rows[0].enrolled_at;

    logger.info(`User enrolled successfully: userId=${user.userId}, pathId=${pathId}, enrolledAt=${enrolledAt}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in learning path',
      data: {
        pathId: parseInt(pathId),
        userId: user.userId,
        enrolledAt,
        status: 'in_progress'
      }
    });

  } catch (error: any) {
    logger.error(`Error enrolling user in learning path: ${error.message}`);
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to enroll in learning path' } },
      { status: 500 }
    );
  }
}