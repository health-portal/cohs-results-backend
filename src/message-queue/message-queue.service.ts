import { Injectable } from '@nestjs/common';
import {
  EmailSubject,
  NotificationSchema,
  notificationTemplate,
  ParseFilePayload,
  QueueTable,
  SendEmailPayload,
  SetPasswordSchema,
  setPasswordTemplate,
} from './message-queue.schema';
import { TokensService } from 'src/tokens/tokens.service';
import { TokenPayload } from 'src/auth/auth.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MessageQueueService {
  constructor(
    @InjectQueue(QueueTable.EMAILS) private emailQueue: Queue,
    @InjectQueue(QueueTable.FILES) private fileQueue: Queue,
    private readonly tokensService: TokensService,
  ) {}

  private async generateTokenUrl(
    isActivateAccount: boolean,
    tokenPayload: TokenPayload,
  ) {
    return isActivateAccount
      ? await this.tokensService.genActivateAccountUrl(tokenPayload)
      : await this.tokensService.genResetPasswordUrl(tokenPayload);
  }

  async enqueueEmail(data: SetPasswordSchema | NotificationSchema) {
    if (data instanceof SetPasswordSchema) {
      const url = await this.generateTokenUrl(
        data.isActivateAccount,
        data.tokenPayload,
      );

      console.log('URL:', url);

      const payload: SendEmailPayload = {
        subject: data.isActivateAccount
          ? EmailSubject.ACTIVATE_ACCOUNT
          : EmailSubject.RESET_PASSWORD,
        toEmail: data.tokenPayload.email,
        content: setPasswordTemplate(data.isActivateAccount, url),
      };

      return await this.emailQueue.add('sendEmail', payload, {
        removeOnComplete: true,
        priority: data.isActivateAccount ? 10 : 100, // Reset password emails - high priority, Activate account emails - medium priority
      });
    } else if (data instanceof NotificationSchema) {
      const payload: SendEmailPayload = {
        subject: data.subject,
        toEmail: data.email,
        content: notificationTemplate(data.title, data.message),
      };

      // Notification email - low priority
      return await this.emailQueue.add('sendEmail', payload, {
        removeOnComplete: true,
      });
    }
  }

  async enqueueFile(payload: ParseFilePayload) {
    return await this.fileQueue.add('parseFile', payload, {
      removeOnComplete: true,
    });
  }
}
