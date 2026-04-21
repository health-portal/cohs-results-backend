import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, ResultType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { ProcessResultsPayload } from 'src/message-queue/message-queue.dto';

@Injectable()
export class ResultProcessorService {
  private readonly logger = new Logger(ResultProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}


  async processResultUpload(payload: ProcessResultsPayload): Promise<void> {
    const { resultUploadId, courseSesnDeptLevelId} = payload;

    this.logger.log(`Processing ResultUpload ${resultUploadId}`);

    // 1. Fetch the ResultUpload with everything needed
    const resultUpload = await this.prisma.resultUpload.findUnique({
      where: { id: resultUploadId },
      include: {
        courseSesnDeptLevel: true,
        courseSession: {
          include: {
            gradingSystem: {
              include: {
                fields: true,
                ranges: { orderBy: { minScore: 'desc' } },
              },
            },
          },
        },
      },
    });

    if (!resultUpload) {
      throw new NotFoundException(`ResultUpload ${resultUploadId} not found`);
    }

    if (resultUpload.isProcessed) {
      this.logger.log(
        `ResultUpload ${resultUploadId} already processed — skipping`,
      );
      return;
    }

    
    const resultType = resultUpload.resultType;

    // 2. Verify the approval flow for this dept+level is APPROVED
    const approvalFlow = await this.prisma.approvalFlow.findFirst({
      where: {
        courseSesnDeptLevelId,
        approvalStatus:     ApprovalStatus.APPROVED,
      },
    });

    if (!approvalFlow) {
      throw new Error(
        `Approval flow not yet approved for this dept/level — cannot process`,
      );
    }

    // 3. Download file from Cloudinary
    const fileBuffer = await this.downloadFile(resultUpload.url);

    // 4. Parse rows from Excel or CSV
    const rows = this.parseFile(
      fileBuffer,
      resultUpload.mimetype,
      resultUpload.filename,
    );

    if (!rows.length) {
      throw new Error(`Result file is empty or unreadable`);
    }

    // 5. Resolve grading system
    const gradingSystem = resultUpload.courseSession.gradingSystem;
    const courseSessionId = resultUpload.courseSessionId;

    if (!gradingSystem) {
      throw new Error(
        `No grading system found for this course session `,
      );
    }

    // 6. Process each row
    const stats = {
      processed: 0,
      skipped:   0,
      errors:    [] as string[],
    };

    for (const row of rows) {
      await this.processRow(
        row,
        courseSessionId,
        resultType,
        gradingSystem,
        stats,
      );
    }

    // 7. Mark as processed and store stats
    await this.prisma.resultUpload.update({
      where: { id: resultUploadId },
      data: {
        isProcessed: true,
        metadata: {
          processedAt: new Date().toISOString(),
          stats,
        },
      },
    });

    this.logger.log(
      `ResultUpload ${resultUploadId} done — ` +
        `${stats.processed} processed, ${stats.skipped} skipped`,
    );
  }

  // ============================================================
  // FILE DOWNLOAD
  // ============================================================

  private async downloadFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  // ============================================================
  // FILE PARSING — Excel or CSV
  // ============================================================

  private parseFile(
    buffer:   Buffer,
    mimetype: string,
    filename: string,
  ): Record<string, any>[] {
    const isExcel =
      mimetype.includes('spreadsheet') ||
      mimetype.includes('excel') ||
      filename.endsWith('.xlsx') ||
      filename.endsWith('.xls');

    const isCsv =
      mimetype.includes('csv') ||
      filename.endsWith('.csv');

    if (isExcel) {
      const workbook  = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet     = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { defval: null });
    }

    if (isCsv) {
      return parse(buffer, {
        columns:          true,
        skip_empty_lines: true,
        trim:             true,
      });
    }

    throw new BadRequestException(
      `Unsupported file format: ${filename}. Only Excel and CSV are supported.`,
    );
  }

  // ============================================================
  // ROW PROCESSING
  // ============================================================

  private async processRow(
    row:            Record<string, any>,
    courseSessionId: string,
    resultType:     ResultType,
    gradingSystem: {
      threshold: number;
      fields:    { variable: string; label: string; maxValue: number; weight: number }[];
      ranges:    { label: string; minScore: number; maxScore: number; description: string }[];
    },
    stats: { processed: number; skipped: number; errors: string[] },
  ): Promise<void> {
    // Locate matric number column — case/space insensitive
    const matricKey = Object.keys(row).find((key) =>
      ['matricnumber', 'matric_number', 'matric', 'matricno'].includes(
        key.toLowerCase().replace(/\s/g, ''),
      ),
    );

    if (!matricKey || !row[matricKey]) {
      stats.skipped++;
      stats.errors.push(
        `Row skipped — no matric number found: ${JSON.stringify(row)}`,
      );
      return;
    }

    const matricNumber = String(row[matricKey]).trim();

    try {
      // Validate each grading field
      const scores: Record<string, number> = {};
      const fieldErrors: string[]          = [];

      for (const field of gradingSystem.fields) {
        // Match column by variable name or label
        const rawValue = row[field.variable] ?? row[field.label];

        if (rawValue === null || rawValue === undefined || rawValue === '') {
          fieldErrors.push(
            `Missing value for "${field.label}" (${field.variable})`,
          );
          continue;
        }

        const value = Number(rawValue);

        if (isNaN(value)) {
          fieldErrors.push(
            `Invalid value "${rawValue}" for "${field.label}" — must be a number`,
          );
          continue;
        }

        if (value < 0 || value > field.maxValue) {
          fieldErrors.push(
            `Value ${value} for "${field.label}" exceeds max (${field.maxValue})`,
          );
          continue;
        }

        scores[field.variable] = value;
      }

      if (fieldErrors.length) {
        stats.skipped++;
        stats.errors.push(`Matric ${matricNumber}: ${fieldErrors.join('; ')}`);
        return;
      }

      // Compute weighted total and grade
      const evaluations = this.evaluateScores(scores, gradingSystem);

      // Find student by matric number
      const student = await this.prisma.student.findUnique({
        where:  { matricNumber },
        select: { id: true },
      });

      if (!student) {
        stats.skipped++;
        stats.errors.push(`Student not found: ${matricNumber}`);
        return;
      }

      // Find their enrollment in this course session
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          uniqueEnrollment: {
            studentId:       student.id,
            courseSessionId: courseSessionId,
          },
        },
        select: { id: true },
      });

      if (!enrollment) {
        stats.skipped++;
        stats.errors.push(
          `No enrollment for matric ${matricNumber} in this course session`,
        );
        return;
      }

      // Upsert Result
      await this.prisma.result.upsert({
        where: {
          uniqueResult: {
            enrollmentId: enrollment.id,
            type:         resultType,
          },
        },
        update: { scores, evaluations },
        create: {
          enrollmentId: enrollment.id,
          type:         resultType,
          scores,
          evaluations,
        },
      });

      stats.processed++;
    } catch (error) {
      stats.skipped++;
      stats.errors.push(
        `Error processing matric ${matricNumber}: ${error.message}`,
      );
    }
  }

  // ============================================================
  // SCORE EVALUATION
  // ============================================================

  private evaluateScores(
    scores: Record<string, number>,
    gradingSystem: {
      threshold: number;
      fields:    { variable: string; maxValue: number; weight: number }[];
      ranges:    { label: string; minScore: number; maxScore: number; description: string }[];
    },
  ): Record<string, any> {
    // Weighted total — (score / maxValue) * weight per field
    const weightedTotal = gradingSystem.fields.reduce((total, field) => {
      const score    = scores[field.variable] ?? 0;
      const weighted = (score / field.maxValue) * field.weight;
      return total + weighted;
    }, 0);

    const total = Math.round(weightedTotal * 100) / 100;

    // Match grade range — ranges ordered highest minScore first
    const matchedRange = gradingSystem.ranges.find(
      (range) => total >= range.minScore && total <= range.maxScore,
    );

    return {
      total,
      grade:       matchedRange?.label       ?? 'N/A',
      description: matchedRange?.description ?? 'No matching grade range',
      passed:      total >= gradingSystem.threshold,
    };
  }
}