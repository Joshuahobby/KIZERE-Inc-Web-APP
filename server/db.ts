import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolUrl = process.env.DATABASE_URL?.replace('.us-east-2', '-pooler.us-east-2');
export const pool = new Pool({ 
  connectionString: poolUrl,
  max: 10,
  ssl: {
    rejectUnauthorized: false
  }
});
export const db = drizzle(pool, { schema });
