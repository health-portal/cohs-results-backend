import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { env } from 'src/lib/environment';
import { createClient } from 'smtpexpress';
import {
  ParseFilePayload,
  QueueTable,
  SendEmailPayload,
} from './message-queue.schema';
import { FilesModule } from 'src/files/files.module';
import { FilesService } from 'src/files/files.service';

@Module({
  imports: [FilesModule],
})
export class MessageQueueWorkersModule
  implements OnModuleInit, OnModuleDestroy
{
  private readonly boss: PgBoss;
  private readonly emailClient: ReturnType<typeof createClient>;

  constructor(private readonly filesService: FilesService) {
    this.boss = new PgBoss(env.DATABASE_URL);
    this.emailClient = createClient({
      projectId: env.SMTPEXPRESS_PROJECT_ID,
      projectSecret: env.SMTPEXPRESS_PROJECT_SECRET,
    });
  }

  async onModuleInit() {
    await this.boss.start();
    const queueResults = await this.boss.getQueues();
    const queueNames = queueResults.map((queue) => queue.name);

    for (const table of Object.values(QueueTable)) {
      if (!queueNames.includes(table)) {
        await this.boss.createQueue(table);
        console.log(`Queue ${table} created`);
      }
    }

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
