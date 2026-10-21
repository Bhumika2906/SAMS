import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.join(__dirname, '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/sams'),
  JWT_SECRET: z.string().min(16).default('super_secret_jwt_key_for_sams_development_prototype_32chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STORAGE_ADAPTER: z.enum(['local', 'cloudinary']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5_242_880),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  LOG_LEVEL: z.string().default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | undefined;

export function loadConfig(overrides?: Record<string, string | undefined>): AppConfig {
  if (cached && !overrides) return cached;
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (!overrides) cached = parsed.data;
  return parsed.data;
}

export function resetConfigCache(): void {
  cached = undefined;
}
