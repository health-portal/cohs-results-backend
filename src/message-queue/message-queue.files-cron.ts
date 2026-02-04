import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { ParseFilePayload, QueueTable } from './message-queue.dto';
import { FilesModule } from 'src/files/files.module';
import { FilesService } from 'src/files/files.service';
import { JwtModule } from '@nestjs/jwt';
import { TokensModule } from 'src/tokens/tokens.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PgBossProvider } from './pg-boss.provider';
import env from 'src/environment';

@Module({
  imports: [
    FilesModule,
    JwtModule.register({ secret: env.JWT_SECRET, global: true }),
    PrismaModule,
    TokensModule,
  ],
  providers: [PgBossProvider],
})
export class MessageQueueFilesCronModule
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly filesService: FilesService,
    @Inject('PG_BOSS') private readonly boss: PgBoss,
  ) {}

  async onModuleInit() {
    await this.processFileCron();
  }

  async onModuleDestroy() {
    await this.boss.stop();
  }

  private async processFileCron() {
    const MAX_RUNTIME_MS = 4 * 60 * 1000;
    const start = Date.now();

    let processed = 0;

    while (true) {
      if (Date.now() - start > MAX_RUNTIME_MS) {
        console.warn('[FILE] Max runtime reached, stopping');
        break;
      }
      const jobs = await this.boss.fetch(QueueTable.FILES, {
        batchSize: 1,
      });
      if (!jobs || jobs.length === 0) break;

      for (const job of jobs) {
        const payload = job.data as ParseFilePayload;
        await this.filesService.parseFile(payload);

        processed++;
      }
    }

    console.log(`[FILE] Processed ${processed} jobs`);
  }
}
