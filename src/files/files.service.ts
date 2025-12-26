import {
    BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GradingSystemsService } from 'src/grading-systems/grading-systems.service';
import { MessageQueueService } from 'src/message-queue/message-queue.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as xlsx from 'xlsx';
import Papa from 'papaparse';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MessageQueueService))
    private readonly messageQueueService: MessageQueueService,
    private readonly gradingSystemsService: GradingSystemsService,
  ) {}

  async getFiles(userId: string) {
    return await this.prisma.file.findMany({
      where: { userId },
    });
  }

  private normalizeToCsv(buffer: Buffer, mimetype: string) {
    switch (mimetype) {
      case 'text/csv':
      case 'application/csv':
      case 'text/plain':
        return buffer.toString('utf-8');

      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/xlsx':
      case 'application/vnd.ms-excel':
      case 'application/xls':
      case 'application/x-excel':
      case 'application/vnd.ms-excel.sheet.binary.macroenabled.12':
      case 'application/vnd.oasis.opendocument.spreadsheet': {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        return workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          return xlsx.utils.sheet_to_csv(sheet);
        });
      }

      default:
        throw new UnprocessableEntityException('Unsupported file type');
    }
  }

  private validateHeaders(csvContent: string, expectedHeaders: string[]) {
    const result = Papa.parse(csvContent, { preview: 1, skipEmptyLines: true });
    const headers = Object.keys(result.meta.fields);
    if (!headers.every((h, i) => h === expectedHeaders[i])) {
      throw new BadRequestException('Invalid headers');
    }
    return headers;
  }
}
