import { Module } from '@nestjs/common';
import { GradingSystemsService } from './grading-systems.service';
import { GradingSystemsController } from './grading-systems.controller';

@Module({
  controllers: [GradingSystemsController],
  providers: [GradingSystemsService],
})
export class GradingSystemsModule {}
