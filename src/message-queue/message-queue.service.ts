import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { pgmq, Task } from 'prisma-pgmq';
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
import { PrismaClient } from 'prisma/client/message-queue';
import { TokensService } from 'src/tokens/tokens.service';
import { TokenPayload } from 'src/auth/auth.schema';

@Injectable()
export class MessageQueueService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly tokensService: TokensService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async generateTokenUrl(
    isActivateAccount: boolean,
    tokenPayload: TokenPayload,
  ) {
    return isActivateAccount
      ? await this.tokensService.genActivateAccountUrl(tokenPayload)
      : await this.tokensService.genResetPasswordUrl(tokenPayload);
  }

  async enqueueHiPriorityEmail({
    isActivateAccount,
    tokenPayload,
  }: SetPasswordSchema) {
    const url = await this.generateTokenUrl(isActivateAccount, tokenPayload);

    const payload: SendEmailPayload = {
      subject: isActivateAccount
        ? EmailSubject.ACTIVATE_ACCOUNT
        : EmailSubject.RESET_PASSWORD,
      toEmail: tokenPayload.email,
      content: setPasswordTemplate(isActivateAccount, url),
    };

    await pgmq.send(
      this,
      QueueTable.HI_PRIORITY_EMAILS,
      payload as unknown as Task,
    );
  }

  async enqueueLowPriorityEmail({
    subject,
    message,
    title,
    email,
  }: NotificationSchema) {
    const payload: SendEmailPayload = {
      subject,
      toEmail: email,
      content: notificationTemplate(title, message),
    };

    await pgmq.send(
      this,
      QueueTable.LO_PRIORITY_EMAILS,
      payload as unknown as Task,
    );
  }

  async enqueueFile(payload: ParseFilePayload) {
    await pgmq.send(this, QueueTable.FILES, payload as unknown as Task);
  }
}
