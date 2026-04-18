import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApprovalManager } from './approval.manager';
import { ApprovalStatus, FileCategory } from '@prisma/client';

@Injectable()
export class ApprovalsService {
    constructor(private readonly prisma: PrismaService,
    private readonly approvalManager: ApprovalManager,)
    {}

}