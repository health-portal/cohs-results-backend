import { Logger, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApprovalManager } from './approval.manager';
import { ApprovalController } from './approvals.controller';
import { TemplateManagerService } from './template-manager.service';
import { PipelineResolverService } from './pipeline-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [
    ApprovalManager,
    PipelineResolverService,
    TemplateManagerService,
    Logger,
  ],
  controllers: [ApprovalController],
  exports: [ApprovalManager, TemplateManagerService],
})
export class ApprovalModule {}