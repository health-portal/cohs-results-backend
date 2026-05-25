import { Provider } from '@nestjs/common';
import Redis from 'ioredis';
import env from 'src/environment';

export const RedisProvider: Provider = {
  provide: 'REDIS',
  useFactory: () => {
    return new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required for BullMQ
    });
  },
};