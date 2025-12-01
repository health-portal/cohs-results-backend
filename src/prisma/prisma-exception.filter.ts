import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownError(exception, response);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation error',
        error: 'Bad Request',
        details: exception.message,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
      error: 'Internal Server Error',
      details: exception instanceof Error ? exception.message : 'Unknown error',
    });
  }

  private handleKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
  ) {
    switch (exception.code) {
      case 'P2002': {
        const fields = exception.meta?.target as string[] | undefined;
        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint failed',
          error: 'Conflict',
          details: {
            code: exception.code,
            fields: fields || [],
            meta: exception.meta,
          },
        });
      }

      case 'P2025':
      case 'P2001':
      case 'P2015':
      case 'P2018':
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
          details: {
            code: exception.code,
            meta: exception.meta,
          },
        });

      case 'P2003':
      case 'P2011':
      case 'P2014':
      case 'P2017':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid data provided',
          error: 'Bad Request',
          details: {
            code: exception.code,
            meta: exception.meta,
          },
        });

      case 'P2000':
      case 'P2006':
      case 'P2007':
      case 'P2012':
      case 'P2013':
      case 'P2019':
      case 'P2020':
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid input',
          error: 'Bad Request',
          details: {
            code: exception.code,
            meta: exception.meta,
          },
        });

      default:
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          details: {
            code: exception.code,
            meta: exception.meta,
          },
        });
    }
  }
}
