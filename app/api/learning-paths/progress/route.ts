import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);
    const body = await req.json();
    
    const { courseId, status, completedAt } = body;

    if (!courseId || !status || !['in_progress', 'completed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid courseId and status (in_progress|completed) are required' } },
        { status: 400 }
      );
    }

    logger.info(`Updating course progress: userId=${user.userId}, courseId=${courseId}, status=${status}`);

    // Get course and path information
    const courseInfoQuery = `
      SELECT c.id, c.title, c.milestone_id, c.order_index as course_order,
             m.path_id, m.order_index as milestone_order, m.title as milestone_title,
             lp.total_courses, lp.organization_id
      FROM courses c
      JOIN milestones m ON c.milestone_id = m.id
      JOIN learning_paths lp ON m.path_id = lp.id
      WHERE c.id = $1 AND lp.organization_id = $2
    `;
    
    const courseResult = await query<{
      id: number;
      title: string;
      milestone_id: number;
      course_order: number;
      path_id: number;
      milestone_order: number;
      milestone_title: string;
      total_courses: number;
      organization_id: string;
    }>(courseInfoQuery, [courseId, user.organizationId]);

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // Check if user is enrolled in the path
    const enrollmentCheckQuery = `
      SELECT id FROM user_enrollments 
      WHERE user_id = $1 AND path_id = $2
    `;
    
    const enrollmentResult = await query(enrollmentCheckQuery, [user.userId, course.path_id]);

    if (enrollmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'User is not enrolled in this learning path' } },
        { status: 403 }
      );
    }

    // Update course progress
    const updateProgressQuery = `
      INSERT INTO user_course_progress (user_id, course_id, status, completed_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, course_id)
      DO UPDATE SET 
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        updated_at = NOW()
      RETURNING status, completed_at
    `;
    
    const completedAtValue = status === 'completed' ? (completedAt || new Date().toISOString()) : null;
    
    await query(updateProgressQuery, [user.userId, courseId, status, completedAtValue]);

    // If course is completed, unlock next course
    if (status === 'completed') {
      // Find next course in the same milestone
      const nextCourseQuery = `
        SELECT id FROM courses 
        WHERE milestone_id = $1 AND order_index = $2
      `;
      
      const nextCourseResult = await query<{ id: number }>(
        nextCourseQuery, 
        [course.milestone_id, course.course_order + 1]
      );

      if (nextCourseResult.rows.length > 0) {
        // Unlock next course in same milestone
        const unlockQuery = `
          INSERT INTO user_course_progress (user_id, course_id, status, updated_at)
          VALUES ($1, $2, 'available', NOW())
          ON CONFLICT (user_id, course_id) DO NOTHING
        `;
        await query(unlockQuery, [user.userId, nextCourseResult.rows[0].id]);
      } else {
        // Check if milestone is complete and unlock next milestone
        const milestoneCompleteQuery = `
          SELECT COUNT(*) as total_courses,
                 COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_courses
          FROM courses c
          LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
          WHERE c.milestone_id = $1
        `;
        
        const milestoneResult = await query<{ total_courses: string; completed_courses: string }>(
          milestoneCompleteQuery, 
          [course.milestone_id, user.userId]
        );

        const totalCourses = parseInt(milestoneResult.rows[0].total_courses);
        const completedCourses = parseInt(milestoneResult.rows[0].completed_courses);

        if (totalCourses === completedCourses) {
          // Unlock first course of next milestone
          const nextMilestoneQuery = `
            SELECT c.id FROM courses c
            JOIN milestones m ON c.milestone_id = m.id
            WHERE m.path_id = $1 AND m.order_index = $2 AND c.order_index = 1
          `;
          
          const nextMilestoneResult = await query<{ id: number }>(
            nextMilestoneQuery, 
            [course.path_id, course.milestone_order + 1]
          );

          if (nextMilestoneResult.rows.length > 0) {
            const unlockQuery = `
              INSERT INTO user_course_progress (user_id, course_id, status, updated_at)
              VALUES ($1, $2, 'available', NOW())
              ON CONFLICT (user_id, course_id) DO NOTHING
            `;
            await query(unlockQuery, [user.userId, nextMilestoneResult.rows[0].id]);
          }
        }
      }
    }

    // Calculate overall path progress
    const pathProgressQuery = `
      SELECT 
        COUNT(CASE WHEN ucp.status = 'completed' THEN 1 END) as completed_courses,
        lp.total_courses
      FROM learning_paths lp
      LEFT JOIN milestones m ON lp.id = m.path_id
      LEFT JOIN courses c ON m.id = c.milestone_id
      LEFT JOIN user_course_progress ucp ON c.id = ucp.course_id AND ucp.user_id = $2
      WHERE lp.id = $1
      GROUP BY lp.total_courses
    `;
    
    const progressResult = await query<{ completed_courses: string; total_courses: number }>(
      pathProgressQuery, 
      [course.path_id, user.userId]
    );

    const completedCoursesCount = parseInt(progressResult.rows[0]?.completed_courses || '0');
    const totalCoursesCount = progressResult.rows[0]?.total_courses || course.total_courses;
    const pathProgress = (completedCoursesCount / totalCoursesCount) * 100;
    const pathStatus = pathProgress === 100 ? 'completed' : 'in_progress';

    // Update enrollment progress
    const updateEnrollmentQuery = `
      UPDATE user_enrollments 
      SET progress = $1, completed_courses = $2, status = $3, last_activity = NOW()
      WHERE user_id = $4 AND path_id = $5
    `;
    
    await query(updateEnrollmentQuery, [
      pathProgress, 
      completedCoursesCount, 
      pathStatus,
      user.userId, 
      course.path_id
    ]);

    // Get next unlocked course
    const nextUnlockedQuery = `
      SELECT c.id, c.title
      FROM courses c
      JOIN milestones m ON c.milestone_id = m.id
      JOIN user_course_progress ucp ON c.id = ucp.course_id
      WHERE m.path_id = $1 AND ucp.user_id = $2 AND ucp.status = 'available'
      ORDER BY m.order_index, c.order_index
      LIMIT 1
    `;
    
    const nextUnlockedResult = await query<{ id: number; title: string }>(
      nextUnlockedQuery, 
      [course.path_id, user.userId]
    );

    const nextUnlockedCourse = nextUnlockedResult.rows[0] || null;

    logger.info(`Course progress updated successfully: userId=${user.userId}, courseId=${courseId}, newStatus=${status}, pathProgress=${pathProgress}, pathStatus=${pathStatus}`);

    return NextResponse.json({
      success: true,
      message: 'Progress updated successfully',
      data: {
        courseId,
        newStatus: status,
        pathProgress: Math.round(pathProgress * 10) / 10,
        nextUnlockedCourse
      }
    });

  } catch (error: any) {
    logger.error(`Error updating course progress: ${error.message}`);
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update course progress' } },
      { status: 500 }
    );
  }
}