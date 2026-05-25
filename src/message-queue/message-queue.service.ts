import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { TokenPayload } from 'src/auth/auth.dto';
import { TokensService } from 'src/tokens/tokens.service';
import {
  EmailSubject,
  NotificationSchema,
  notificationTemplate,
  type ParseFilePayload,
  ProcessResultsPayload,
  QueueTable,
  type SendEmailPayload,
  SetPasswordSchema,
  setPasswordTemplate,
} from './message-queue.dto';
import type Redis from 'ioredis';

@Injectable()
export class MessageQueueService {
  private readonly emailQueue:   Queue;
  private readonly fileQueue:    Queue;
  private readonly resultsQueue: Queue;

  constructor(
    private readonly tokensService: TokensService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {
    const connection = this.redis;
    this.emailQueue   = new Queue(QueueTable.EMAILS,         { connection });
    this.fileQueue    = new Queue(QueueTable.FILES,           { connection });
    this.resultsQueue = new Queue(QueueTable.PROCESS_RESULTS, { connection });
  }

  private async generateTokenUrl(
    isActivateAccount: boolean,
    tokenPayload: TokenPayload,
  ) {
    return isActivateAccount
      ? await this.tokensService.genActivateAccountUrl(tokenPayload)
      : await this.tokensService.genResetPasswordUrl(tokenPayload);
  }

  async enqueueSetPasswordEmail(data: SetPasswordSchema) {
    const url = await this.generateTokenUrl(
      data.isActivateAccount,
      data.tokenPayload,
    );

    const payload: SendEmailPayload = {
      subject: data.isActivateAccount
        ? EmailSubject.ACTIVATE_ACCOUNT
        : EmailSubject.RESET_PASSWORD,
      toEmail: data.tokenPayload.email,
      content: setPasswordTemplate(data.isActivateAccount, url),
    };

    return this.emailQueue.add('send-email', payload, {
      priority: data.isActivateAccount ? 2 : 1,
    });
  }

  async enqueueNotificationEmail(data: NotificationSchema) {
    const payload: SendEmailPayload = {
      subject: data.subject,
      toEmail: data.email,
      content: notificationTemplate(data.title, data.message),
    };

    return this.emailQueue.add('send-email', payload, { priority: 0 });
  }

  async enqueueFile(payload: ParseFilePayload) {
    return this.fileQueue.add('parse-file', payload);
  }

  async enqueueProcessResults(payload: ProcessResultsPayload): Promise<void> {
    await this.resultsQueue.add('process-results', payload);
  }
}