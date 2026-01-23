import { NestFactory } from '@nestjs/core';
import { MessageQueueCronModule } from './message-queue/message-queue.cron';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    MessageQueueCronModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
