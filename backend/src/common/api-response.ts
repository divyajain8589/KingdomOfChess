/**
 * Every REST response uses one of these two envelopes.
 *   success: { success: true,  data }
 *   failure: { success: false, error: { statusCode, code, message, details? } }
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { statusCode: number; code: string; message: string; details?: string[] };
}
