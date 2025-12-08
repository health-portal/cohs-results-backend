import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { TokenPayload } from 'src/auth/auth.schema';
import { env } from 'src/lib/environment';
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
} from './message-queue.schema';

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly boss: PgBoss;
  constructor(private readonly tokensService: TokensService) {
    this.boss = new PgBoss(env.DATABASE_URL);
  }

  async onModuleInit() {
    await this.boss.start();
    const queueResults = await this.boss.getQueues();
    const queueNames = queueResults.map((queue) => queue.name);

    for (const table of Object.values(QueueTable)) {
      if (!queueNames.includes(table))
        throw new Error(`Queue ${table} not found`);
    }
  }

  async onModuleDestroy() {
    await this.boss.stop();
  }

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
    } else if (data instanceof NotificationSchema) {
      const payload: SendEmailPayload = {
        subject: data.subject,
        toEmail: data.email,
        content: notificationTemplate(data.title, data.message),
      };

      // Notification email - low priority
      return await this.boss.send(QueueTable.EMAILS, payload, { priority: 0 });
    }
  }

  async enqueueFile(payload: ParseFilePayload) {
    return await this.boss.send(QueueTable.FILES, payload);
  }
}
