import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiFailure } from './api-response';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

/** Normalises every error (validation, auth, our AppExceptions, crashes) into ApiFailure. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = DEFAULT_CODES[statusCode] ?? 'ERROR';
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const b = body as { code?: string; message?: string | string[] };
        if (b.code) code = b.code;
        if (Array.isArray(b.message)) {
          // class-validator: list of constraint messages.
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = b.message;
        } else if (b.message) {
          message = b.message;
        }
      }
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const payload: ApiFailure = { success: false, error: { statusCode, code, message, ...(details && { details }) } };
    res.status(statusCode).json(payload);
  }
}
