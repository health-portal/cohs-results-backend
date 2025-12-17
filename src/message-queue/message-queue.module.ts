import { forwardRef, Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { MessageQueueService } from './message-queue.service';
import { PgBossProvider } from './pg-boss.provider';

@Module({
  imports: [TokensModule, forwardRef(() => FilesModule)],
  providers: [MessageQueueService, PgBossProvider],
  exports: ['PG_BOSS', MessageQueueService],
})
export class MessageQueueModule {}
