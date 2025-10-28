import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';

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

    logger.info('Fetching rewards for learning path', { 
      userId: user.userId, 
      organizationId: user.organizationId,
      pathId 
    });

    // Get path information and completion status
    const pathQuery = `
      SELECT lp.title, lp.badges, ue.status, ue.progress
      FROM learning_paths lp
      LEFT JOIN user_enrollments ue ON lp.id = ue.path_id AND ue.user_id = $2
      WHERE lp.id = $1 AND lp.organization_id = $3
    `;

    const pathResult = await query<{
      title: string;
      badges: string[];
      status: string;
      progress: number;
    }>(pathQuery, [pathId, user.userId, user.organizationId]);

    if (pathResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Learning path not found' } },
        { status: 404 }
      );
    }

    const path = pathResult.rows[0];

    // Get badges/rewards for this path
    const badges = (path.badges || []).map((badge: string, index: number) => ({
      id: `badge-${pathId}-${index}`,
      name: badge,
      description: `Earned by completing the ${path.title} learning path`,
      iconUrl: `https://storage.example.com/badges/${badge.toLowerCase().replace(/\s+/g, '-')}.png`
    }));

    // Calculate points based on path completion
    const basePoints = 100;
    const progressMultiplier = (path.progress || 0) / 100;
    const points = Math.round(basePoints * progressMultiplier);

    // Check certificate availability
    const certificateAvailable = path.status === 'completed' && (path.progress || 0) >= 100;

    const rewards = {
      badges,
      points,
      certificate: {
        available: certificateAvailable,
        title: `${path.title} Certificate`
      }
    };

    logger.info('Rewards fetched successfully', { 
      userId: user.userId,
      pathId,
      rewardsCount: badges.length,
      points,
      certificateAvailable
    });

    return NextResponse.json({
      success: true,
      data: rewards
    });

  } catch (error: any) {
    logger.error('Error fetching rewards', { error: error.message, pathId: params.pathId });
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rewards' } },
      { status: 500 }
    );
  }
}