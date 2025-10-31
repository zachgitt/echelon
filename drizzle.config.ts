import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load .env.local to match Next.js behavior
config({ path: '.env.local' });

export default {
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
