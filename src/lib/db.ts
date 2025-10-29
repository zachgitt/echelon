import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection to Supabase database
const client = postgres(process.env.DATABASE_URL);

// Create drizzle instance with schema
export const db = drizzle(client, { schema });
