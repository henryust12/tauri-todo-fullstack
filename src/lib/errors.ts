import type { AppError, AppErrorKind } from './types';

const KINDS: readonly AppErrorKind[] = ['validation', 'notFound', 'storage'];

function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, message } = value as Record<string, unknown>;
  return (
    typeof message === 'string' && typeof kind === 'string' && KINDS.includes(kind as AppErrorKind)
  );
}

/** Normalize anything thrown by `invoke` (or a fake) into the contract's error shape. */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return { kind: value.kind, message: value.message };
  if (typeof value === 'string' && value) return { kind: 'storage', message: value };
  if (value instanceof Error && value.message) return { kind: 'storage', message: value.message };
  return { kind: 'storage', message: 'Something went wrong. Try again.' };
}
