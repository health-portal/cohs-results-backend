import { forwardRef, Module } from '@nestjs/common';
import { FilesModule } from 'src/files/files.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { MessageQueueService } from './message-queue.service';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [TokensModule, forwardRef(() => FilesModule)],
  providers: [MessageQueueService, RedisProvider],
  exports: ['REDIS', MessageQueueService],
})
export class MessageQueueModule {}