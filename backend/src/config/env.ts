import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('3000'),
  AI_TEXT_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  AI_IMAGE_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  AI_AUDIO_SERVICE_URL: z.string().url().default('http://localhost:8002'),
  CORS_ORIGIN: z.string().default('chrome-extension://*')
});

export const env = envSchema.parse(process.env);