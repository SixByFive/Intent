export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = IntentError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export type IntentErrorCode =
  | "NOT_INITIALIZED"
  | "ALREADY_INITIALIZED"
  | "FILE_NOT_FOUND"
  | "PARSE_ERROR"
  | "VALIDATION_ERROR"
  | "WRITE_ERROR"
  | "GIT_ERROR"
  | "INVALID_ID"
  | "INVALID_INPUT";

export interface IntentError {
  code: IntentErrorCode;
  message: string;
  cause?: unknown;
}

export function intentError(code: IntentErrorCode, message: string, cause?: unknown): IntentError {
  return { code, message, cause };
}
