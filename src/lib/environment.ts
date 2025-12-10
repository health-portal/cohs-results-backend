import { cleanEnv, str, json, url, port } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  DATABASE_URL: str(),
  DEFAULT_ADMINS: json<{ name: string; email: string }[]>(),
  FRONTEND_BASE_URL: url(),
  JWT_SECRET: str(),
  PORT: port(),
  SMTPEXPRESS_PROJECT_ID: str(),
  SMTPEXPRESS_PROJECT_SECRET: str(),
  SMTPEXPRESS_SENDER_EMAIL: str(),
});
