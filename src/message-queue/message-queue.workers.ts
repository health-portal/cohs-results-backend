import { Inject, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { createClient } from 'smtpexpress';
import {
  ParseFilePayload,
  ProcessResultsPayload,
  QueueTable,
  SendEmailPayload,
} from './message-queue.dto';
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
    await this.boss.start();
    await this.processEmail();
    await this.processFile();
    await this.processResults(); 
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
    console.log(`[WORKER] Received Job ID: ${job.id} with File ID:`);
    
    try {
      await this.filesService.parseFile(payload);
      console.log(`[WORKER] Job ${job.id} finished successfully.`);
    } catch (err) {
      console.error(`[WORKER] Job ${job.id} failed: ${err.message}`);
      throw err; 
    }
    });
  }
  private async processResults() {
    await this.boss.work(QueueTable.PROCESS_RESULTS, async ([job]) => {
      const payload = job.data as ProcessResultsPayload;
      await this.filesService.processResultUpload(payload);
    });
  }
}
