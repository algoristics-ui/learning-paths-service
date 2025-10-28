import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';
import { PathStats } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req);

    logger.info('Fetching learning path stats', { 
      userId: user.userId, 
      organizationId: user.organizationId
    });

    // Get user's enrollment statistics
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN ue.status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN ue.status = 'completed' THEN 1 END) as completed_count,
        COUNT(DISTINCT UNNEST(lp.skills)) as skills_gained,
        COUNT(CASE WHEN ue.status = 'completed' THEN 1 END) as certificates
      FROM user_enrollments ue
      JOIN learning_paths lp ON ue.path_id = lp.id
      WHERE ue.user_id = $1 AND lp.organization_id = $2
    `;

    const statsResult = await query<{
      in_progress_count: string;
      completed_count: string;
      skills_gained: string;
      certificates: string;
    }>(statsQuery, [user.userId, user.organizationId]);

    const stats: PathStats = {
      inProgressCount: parseInt(statsResult.rows[0]?.in_progress_count || '0'),
      completedCount: parseInt(statsResult.rows[0]?.completed_count || '0'),
      skillsGained: parseInt(statsResult.rows[0]?.skills_gained || '0'),
      certificates: parseInt(statsResult.rows[0]?.certificates || '0')
    };

    logger.info('Learning path stats fetched successfully', { 
      userId: user.userId,
      stats
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('Error fetching learning path stats', { error: error.message });
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch learning path stats' } },
      { status: 500 }
    );
  }
}