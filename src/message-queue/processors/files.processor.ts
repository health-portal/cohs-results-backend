import { type ParseFilePayload, QueueTable } from "../message-queue.schema";
import { FilesService } from "src/files/files.service";
import { forwardRef, Inject } from "@nestjs/common";

export class FilesProcessor {
  constructor(
    @Inject(forwardRef(() => FilesService))
    private readonly filesService: FilesService,
  ) {}

  async process(job: Job) {
    await this.filesService.parseFile(job.data as ParseFilePayload);
  }
}
