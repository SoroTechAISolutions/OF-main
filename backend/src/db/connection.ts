import { Pool } from 'pg';

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'of_agency_db',
  user: process.env.DB_USER || 'learnmate',
  password: process.env.DB_PASSWORD || '564321',
});

// Test database connection
export async function testDbConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as now');
    console.log(`Database time: ${result.rows[0].now}`);
  } finally {
    client.release();
  }
}

// Query helper
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: result.rowCount });
  return result;
}
