import { NestFactory } from '@nestjs/core';
import { MessageQueueWorkersModule } from './message-queue/message-queue.workers';

async function bootstrap() {
  await NestFactory.createApplicationContext(MessageQueueWorkersModule, {
    logger: ['error', 'warn', 'log', 'verbose', 'debug'],
  });
}

bootstrap();
