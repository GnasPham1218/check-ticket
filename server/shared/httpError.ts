export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(message, 400);
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Có lỗi xảy ra.';
}

export function getErrorStatus(error: unknown): number {
  return error instanceof HttpError ? error.status : 500;
}
