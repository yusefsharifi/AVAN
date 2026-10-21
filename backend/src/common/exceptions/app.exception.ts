import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ErrorCodeKey } from '../constants/error-codes';

export class AppException extends HttpException {
  public readonly code: string;

  constructor(
    errorCode: ErrorCodeKey,
    overrides?: { message?: string; details?: Record<string, unknown> },
  ) {
    const errDef = (ERROR_CODES as Record<string, any>)[errorCode];
    const message = overrides?.message || errDef?.message || errorCode;
    const body = {
      code: errDef?.code || errorCode,
      message,
      details: overrides?.details,
    };
    super(body, errDef?.httpStatus || HttpStatus.INTERNAL_SERVER_ERROR);
    this.code = errDef?.code || errorCode;
  }
}
