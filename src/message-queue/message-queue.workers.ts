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
export class MessageQueueWorkersModule
  implements OnModuleInit, OnModuleDestroy
{
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
    await this.processEmail();
    await this.processFile();
  }

  async onModuleDestroy() {
    await this.boss.stop();
  }

  private async processEmail() {
    await this.boss.work(QueueTable.EMAILS, async ([job]) => {
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
    });
  }

  private async processFile() {
    await this.boss.work(QueueTable.FILES, async ([job]) => {
      const payload = job.data as ParseFilePayload;
      await this.filesService.parseFile(payload);
    });
  }
}
