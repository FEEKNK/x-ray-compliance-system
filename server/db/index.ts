import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Custom fetch with retry for Neon Serverless
const fetchWithRetry = async (url: string | URL | globalThis.Request, options?: RequestInit): Promise<Response> => {
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        ...options,
        // Optional: add a timeout signal if needed, but Neon usually times out on its own or node fetch throws ConnectTimeoutError
      });
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      console.warn(`[Neon DB] Fetch failed, retrying (${attempt}/${MAX_RETRIES})... Error:`, error instanceof Error ? error.message : error);
      // Wait before retrying (exponential backoff: 1s, 2s)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error('Neon DB fetch failed');
};

neonConfig.fetchFunction = fetchWithRetry as any;
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
