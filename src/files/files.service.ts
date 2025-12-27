import {
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
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ParseCsvData, RowValidationError } from './files.schema';
import { ParseFilePayload } from 'src/message-queue/message-queue.schema';
import { FileCategory } from '@prisma/client';

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

  async parseFile(payload: ParseFilePayload) {
    const { fileId } = payload;
    try {
      const foundFile = await this.prisma.file.findUniqueOrThrow({
        where: { id: fileId },
      });
      const csvContent = this.normalizeToCsv(
        Buffer.from(foundFile.buffer),
        foundFile.mimetype,
      );

      switch (foundFile.category) {
        case FileCategory.COURSES: {
          break;
        }
        case FileCategory.LECTURERS: {
          break;
        }
        case FileCategory.REGISTRATIONS: {
          break;
        }
        case FileCategory.RESULTS: {
          break;
        }
        case FileCategory.STUDENTS: {
          break;
        }
        default:
          break;
      }
    } catch {
      throw new Error('File not found');
    }
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

  private parseCsv<T extends object>(
    csvContent: string,
    validationClass: new () => T,
    headerMappings: Record<string, string>,
    altHeaderMappings?: Record<string, string>,
  ): ParseCsvData<T> {
    const result = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        return headerMappings[header] || altHeaderMappings?.[header] || header;
      },
    });

    const headers = result.meta.fields;

    const headersSet = new Set(headers);
    const expectedHeadersSet = new Set(Object.values(headerMappings));

    if (headers?.length !== expectedHeadersSet.size) {
      throw new Error('Invalid headers');
    }

    for (const header of expectedHeadersSet) {
      if (!headersSet.has(header)) throw new Error('Invalid headers');
    }

    const validRows: T[] = [];
    const invalidRows: RowValidationError[] = [];

    result.data.map((row, index) => {
      const rowInstance = plainToInstance(validationClass, row);
      const errors = validateSync(rowInstance);
      if (errors.length > 0) {
        invalidRows.push({
          row: index + 1,
          errorMessages: errors.map((error) => error.toString()),
        });
      } else {
        validRows.push(rowInstance);
      }
    });

    return { validRows, invalidRows, numberOfRows: result.data.length };
  }

  async createCourses() {}
}
