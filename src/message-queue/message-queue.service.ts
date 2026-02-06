import { Inject, Injectable } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { TokenPayload } from 'src/auth/auth.dto';
import { TokensService } from 'src/tokens/tokens.service';
import {
  EmailSubject,
  NotificationSchema,
  notificationTemplate,
  type ParseFilePayload,
  QueueTable,
  type SendEmailPayload,
  SetPasswordSchema,
  setPasswordTemplate,
} from './message-queue.dto';

@Injectable()
export class MessageQueueService {
  constructor(
    private readonly tokensService: TokensService,
    @Inject('PG_BOSS') private readonly boss: PgBoss,
  ) {}

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

    return await this.boss.send(QueueTable.EMAILS, payload, {
      priority: data.isActivateAccount ? 1 : 2, // Reset password emails - high priority, Activate account emails - medium priority
    });
  }

  async enqueueNotificationEmail(data: NotificationSchema) {
    const payload: SendEmailPayload = {
      subject: data.subject,
      toEmail: data.email,
      content: notificationTemplate(data.title, data.message),
    };

    // Notification email - low priority
    return await this.boss.send(QueueTable.EMAILS, payload, { priority: 0 });
  }

  async enqueueFile(payload: ParseFilePayload) {
    return await this.boss.send(QueueTable.FILES, payload);
  }
}
