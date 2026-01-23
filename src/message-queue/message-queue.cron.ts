import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { createClient } from 'smtpexpress';
import {
  ParseFilePayload,
  QueueTable,
  SendEmailPayload,
} from './message-queue.schema';
import { FilesModule } from 'src/files/files.module';
import { FilesService } from 'src/files/files.service';
import { JwtModule } from '@nestjs/jwt';
import { TokensModule } from 'src/tokens/tokens.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PgBossProvider } from './pg-boss.provider';
import env from 'src/workers.env';

@Module({
  imports: [
    FilesModule,
    JwtModule.register({ secret: env.JWT_SECRET, global: true }),
    PrismaModule,
    TokensModule,
  ],
  providers: [PgBossProvider],
})
export class MessageQueueCronModule implements OnModuleInit, OnModuleDestroy {
  private readonly emailClient: ReturnType<typeof createClient>;

  constructor(
    private readonly filesService: FilesService,
    @Inject('PG_BOSS') private readonly boss: PgBoss,
  ) {
    this.emailClient = createClient({
      projectId: env.SMTPEXPRESS_PROJECT_ID,
      projectSecret: env.SMTPEXPRESS_PROJECT_SECRET,
    });
  }

  async onModuleInit() {
    await this.processEmailCron();
    await this.processFileCron();
  }

  async onModuleDestroy() {
    await this.boss.stop();
  }

  private async processEmailCron() {
    const MAX_RUNTIME_MS = 4 * 60 * 1000;
    const start = Date.now();

    let processed = 0;

    while (true) {
      if (Date.now() - start > MAX_RUNTIME_MS) {
        console.warn('[EMAIL] Max runtime reached, stopping');
        break;
      }
      const jobs = await this.boss.fetch(QueueTable.EMAILS, {
        batchSize: 3,
      });
      if (!jobs || jobs.length === 0) break;

      for (const job of jobs) {
        const { content, toEmail, subject } = job.data as SendEmailPayload;
        await this.emailClient.sendApi.sendMail({
          subject,
          message: content,
          sender: {
            name: 'Obafemi Awolowo University - College of Health Sciences',
            email: env.SMTPEXPRESS_SENDER_EMAIL,
          },
          recipients: [toEmail],
        });

        processed++;
      }
    }

    console.log(`[EMAIL] Processed ${processed} jobs`);
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
