import { HttpException, HttpStatus } from '@nestjs/common';

/** HttpException with a stable machine-readable `code` alongside the human message. */
export class AppException extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ code, message }, status);
  }
}

export const notFound = (what: string) => new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `${what} not found`);
export const conflict = (code: string, message: string) => new AppException(HttpStatus.CONFLICT, code, message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
