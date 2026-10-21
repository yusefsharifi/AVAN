import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES, ErrorCodeKey } from '../constants/error-codes';

interface ErrorDef {
  code: string;
  message: string;
  httpStatus: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();

      // If the exception body is already in our format
      if (
        typeof exResponse === 'object' &&
        exResponse !== null &&
        'code' in exResponse
      ) {
        const errDef = (Object.values(ERROR_CODES) as ErrorDef[]).find(
          (e) => e.code === (exResponse as Record<string, string>).code,
        );
        response.status(status).json({
          success: false,
          error: {
            code: (exResponse as Record<string, string>).code,
            message: errDef?.message || exception.message,
            details: (exResponse as Record<string, unknown>).details,
          },
        });
        return;
      }

      response.status(status).json({
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: exception.message,
        },
      });
      return;
    }

    // Application-level error with known error code
    if (exception instanceof Error && 'code' in exception) {
      const errCode = (exception as { code: string }).code;
      const errDef = ERROR_CODES[errCode as ErrorCodeKey] as ErrorDef | undefined;
      if (errDef) {
        response.status(errDef.httpStatus).json({
          success: false,
          error: {
            code: errDef.code,
            message: errDef.message,
          },
        });
        return;
      }
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'خطای داخلی سرور',
      },
    });
  }
}
