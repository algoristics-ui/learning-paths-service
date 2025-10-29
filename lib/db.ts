import { Pool } from 'pg';
import { env } from './env';

declare global { var pgPoolLearningPaths: Pool | undefined }
const pool = global.pgPoolLearningPaths || new Pool({ connectionString: env.DATABASE_URL });
if (!global.pgPoolLearningPaths) global.pgPoolLearningPaths = pool;
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{ 
  const result = await pool.query(text, params); 
  return { rows: result.rows as T[] }; 
}