import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ParseFilePayload, QueueTable } from './message-queue.dto';
import { FilesModule } from 'src/files/files.module';
import { FilesService } from 'src/files/files.service';
import { JwtModule } from '@nestjs/jwt';
import { TokensModule } from 'src/tokens/tokens.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisProvider } from './redis.provider';
import Redis from 'ioredis';
import env from 'src/environment';

@Module({
  imports: [
    FilesModule,
    JwtModule.register({ secret: env.JWT_SECRET, global: true }),
    PrismaModule,
    TokensModule,
  ],
  providers: [RedisProvider],
})
export class MessageQueueFilesCronModule
  implements OnModuleInit, OnModuleDestroy
{
  private worker: Worker;

  constructor(
    private readonly filesService: FilesService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    this.worker = new Worker(
      QueueTable.FILES,
      async (job) => {
        const payload = job.data as ParseFilePayload;
        await this.filesService.parseFile(payload);
        console.log(`[FILE CRON] Processed job ${job.id}`);
      },
      {
        connection: this.redis,
        concurrency: 1,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}