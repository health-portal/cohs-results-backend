import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ParseFilePayload, QueueTable } from '../message-queue.schema';
import { Job } from 'bullmq';
import { FilesService } from 'src/files/files.service';
import { forwardRef, Inject } from '@nestjs/common';

@Processor(QueueTable.FILES)
export class FilesProcessor extends WorkerHost {
  constructor(
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
  ) {
    super();
  }

  async process(job: Job) {
    await this.filesService.parseFile(job.data as ParseFilePayload);
  }
}
