import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection to Supabase database
// Configure for serverless environments (Vercel)
const client = postgres(process.env.DATABASE_URL, {
  // Maximum number of connections (serverless needs lower values, but enough for bulk operations)
  max: 10,
  // Idle timeout - close connections after 30 seconds
  idle_timeout: 30,
  // Max lifetime of a connection
  max_lifetime: 60 * 30, // 30 minutes
  // Connection timeout
  connect_timeout: 10,
  // Prepare statements - set to false for serverless (prevents connection state issues)
  prepare: false,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });
