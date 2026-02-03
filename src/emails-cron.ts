import { NestFactory } from '@nestjs/core';
import { MessageQueueEmailsCronModule } from './message-queue/message-queue.emails-cron';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    MessageQueueEmailsCronModule,
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
