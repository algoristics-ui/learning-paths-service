import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getUserFromToken } from '@/lib/auth';

export async function POST(
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

    logger.info('Generating certificate for learning path', { 
      userId: user.userId, 
      organizationId: user.organizationId,
      pathId 
    });

    // Check if user has completed the path
    const completionCheckQuery = `
      SELECT ue.status, ue.progress, lp.title, lp.organization_id
      FROM user_enrollments ue
      JOIN learning_paths lp ON ue.path_id = lp.id
      WHERE ue.user_id = $1 AND ue.path_id = $2 AND lp.organization_id = $3
    `;

    const completionResult = await query<{
      status: string;
      progress: number;
      title: string;
      organization_id: string;
    }>(completionCheckQuery, [user.userId, pathId, user.organizationId]);

    if (completionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Learning path enrollment not found' } },
        { status: 404 }
      );
    }

    const enrollment = completionResult.rows[0];

    if (enrollment.status !== 'completed' || enrollment.progress < 100) {
      return NextResponse.json(
        { success: false, error: { code: 'PREREQUISITES_NOT_MET', message: 'Learning path must be completed to generate certificate' } },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const existingCertQuery = `
      SELECT certificate_id, download_url, issued_at, valid_until
      FROM certificates
      WHERE user_id = $1 AND path_id = $2
    `;

    const existingCertResult = await query<{
      certificate_id: string;
      download_url: string;
      issued_at: string;
      valid_until: string;
    }>(existingCertQuery, [user.userId, pathId]);

    if (existingCertResult.rows.length > 0) {
      const cert = existingCertResult.rows[0];
      
      logger.info('Certificate already exists', { 
        userId: user.userId,
        pathId,
        certificateId: cert.certificate_id
      });

      return NextResponse.json({
        success: true,
        data: {
          certificateId: cert.certificate_id,
          downloadUrl: cert.download_url,
          issuedAt: cert.issued_at,
          validUntil: cert.valid_until
        }
      });
    }

    // Generate new certificate
    const certificateId = `cert-${user.userId}-${pathId}-${Date.now()}`;
    const issuedAt = new Date().toISOString();
    const validUntil = new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)).toISOString(); // 2 years
    const downloadUrl = `https://storage.example.com/certificates/${certificateId}.pdf`;

    const insertCertQuery = `
      INSERT INTO certificates (certificate_id, user_id, path_id, download_url, issued_at, valid_until)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING certificate_id, download_url, issued_at, valid_until
    `;

    const certResult = await query<{
      certificate_id: string;
      download_url: string;
      issued_at: string;
      valid_until: string;
    }>(insertCertQuery, [certificateId, user.userId, pathId, downloadUrl, issuedAt, validUntil]);

    const certificate = certResult.rows[0];

    logger.info('Certificate generated successfully', { 
      userId: user.userId,
      pathId,
      certificateId: certificate.certificate_id
    });

    return NextResponse.json({
      success: true,
      data: {
        certificateId: certificate.certificate_id,
        downloadUrl: certificate.download_url,
        issuedAt: certificate.issued_at,
        validUntil: certificate.valid_until
      }
    });

  } catch (error: any) {
    logger.error('Error generating certificate', { error: error.message, pathId: params.pathId });
    
    if (error.message === 'Missing Bearer token' || error.message === 'Invalid token') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate certificate' } },
      { status: 500 }
    );
  }
}