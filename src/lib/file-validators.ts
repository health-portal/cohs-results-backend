import * as csv from 'fast-csv';
import { UnprocessableEntityException } from '@nestjs/common';
import { Readable } from 'stream';
import * as xlsx from 'xlsx';

export async function parseCsvFile(
  content: Buffer,
  expectedHeaders: string[],
  headerMappings?: Record<string, string>,
) {
  const readable = Readable.from(content);
  return new Promise((resolve, reject) => {
    const stream = csv
      .parse({
        headers: headerMappings
          ? (headers) =>
              headers.map((header) => headerMappings[header!] || header)
          : true,
      })
      .on('error', (error) => {
        reject(new UnprocessableEntityException(error.message));
      })
      .on('headers', (headers: string[]) => {
        const invalidHeaders = headers.filter(
          (header) => !expectedHeaders.includes(header),
        );
        if (invalidHeaders.length > 0)
          reject(
            new UnprocessableEntityException(
              'Invalid headers: ' + invalidHeaders.join(', '),
            ),
          );
      })
      .on('end', () => {
        resolve({});
      });

    readable.pipe(stream);
  });
}

export async function parseExcelFile(
  content: Buffer,
  expectedHeaders: string[],
  headerMappings?: Record<string, string>,
) {
  const workbook = xlsx.read(content, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const csvData = xlsx.utils.sheet_to_csv(worksheet);

  return new Promise((resolve, reject) => {
    const stream = csv
      .parse({
        headers: headerMappings
          ? (headers) =>
              headers.map((header) => headerMappings[header!] || header)
          : true,
      })
      .on('error', (error) => {
        reject(new UnprocessableEntityException(error.message));
      })
      .on('headers', (headers: string[]) => {
        const invalidHeaders = headers.filter(
          (header) => !expectedHeaders.includes(header),
        );
        if (invalidHeaders.length > 0)
          reject(
            new UnprocessableEntityException(
              'Invalid headers: ' + invalidHeaders.join(', '),
            ),
          );
      })
      .on('end', () => {
        resolve({});
      });

    stream.write(csvData);
    stream.end();
  });
}
