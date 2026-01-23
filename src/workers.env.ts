import { cleanEnv, str } from 'envalid';
import * as dotenv from 'dotenv';

dotenv.config();

const env = cleanEnv(process.env, {
  DATABASE_URL: str(),
  JWT_SECRET: str(),
  SMTPEXPRESS_PROJECT_ID: str(),
  SMTPEXPRESS_PROJECT_SECRET: str(),
  SMTPEXPRESS_SENDER_EMAIL: str(),
});

export default env;
