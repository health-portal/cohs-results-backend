import { PickType } from '@nestjs/swagger';
import { FileResponse } from 'src/prisma/prisma.responses';

export class FileRes extends PickType(FileResponse, [
  'id',
  'createdAt',
  'filename',
  'description',
  'mimetype',
  'isProcessed',
  'category',
  'metadata',
]) {}
