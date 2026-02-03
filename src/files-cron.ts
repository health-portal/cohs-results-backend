import { NestFactory } from '@nestjs/core';
import { MessageQueueFilesCronModule } from './message-queue/message-queue.files-cron';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    MessageQueueFilesCronModule,
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
