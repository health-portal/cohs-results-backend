import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { createClient } from 'smtpexpress';
import { QueueTable, SendEmailPayload } from './message-queue.dto';
import { JwtModule } from '@nestjs/jwt';
import { TokensModule } from 'src/tokens/tokens.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisProvider } from './redis.provider';
import Redis from 'ioredis';
import env from 'src/environment';

@Module({
  imports: [
    JwtModule.register({ secret: env.JWT_SECRET, global: true }),
    PrismaModule,
    TokensModule,
  ],
  providers: [RedisProvider],
})
export class MessageQueueEmailsCronModule
  implements OnModuleInit, OnModuleDestroy
{
  private readonly emailClient: ReturnType<typeof createClient>;
  private worker: Worker;

  constructor(@Inject('REDIS') private readonly redis: Redis) {
    this.emailClient = createClient({
      projectId:     env.SMTPEXPRESS_PROJECT_ID,
      projectSecret: env.SMTPEXPRESS_PROJECT_SECRET,
    });
  }

  async onModuleInit() {
    this.worker = new Worker(
      QueueTable.EMAILS,
      async (job) => {
        const { content, toEmail, subject } = job.data as SendEmailPayload;
        await this.emailClient.sendApi.sendMail({
          subject,
          message: content,
          sender: {
            name:  'Obafemi Awolowo University - College of Health Sciences',
            email: env.SMTPEXPRESS_SENDER_EMAIL,
          },
          recipients: [toEmail],
        });
        console.log(`[EMAIL CRON] Sent email to ${toEmail}`);
      },
      {
        connection:  this.redis,
        concurrency: 3,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}