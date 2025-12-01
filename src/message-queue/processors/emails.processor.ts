import { Processor, WorkerHost } from '@nestjs/bullmq';
import { QueueTable, SendEmailPayload } from '../message-queue.schema';
import { Job } from 'bullmq';
import { createClient } from 'smtpexpress';
import { env } from 'src/lib/environment';

@Processor(QueueTable.EMAILS)
export class EmailsProcessor extends WorkerHost {
  private readonly emailClient: ReturnType<typeof createClient>;

  constructor() {
    super();
    this.emailClient = createClient({
      projectId: env.SMTPEXPRESS_PROJECT_ID,
      projectSecret: env.SMTPEXPRESS_PROJECT_SECRET,
    });
  }

  async process(job: Job) {
    const { subject, content, toEmail } = job.data as SendEmailPayload;
    const { statusCode } = await this.emailClient.sendApi.sendMail({
      subject,
      message: content,
      sender: {
        name: 'Obafemi Awolowo University - College of Health Sciences',
        email: env.SMTPEXPRESS_SENDER_EMAIL,
      },
      recipients: [toEmail],
    });

    console.log('Email sent:', statusCode === 200);
    return statusCode === 200;
  }
}
