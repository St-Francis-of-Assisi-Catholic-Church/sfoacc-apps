/**
 * Extracts a human-readable error message from an API response.
 *
 * Handles the structured validation error format:
 *   { detail: "Validation Error", errors: [{ msg, loc, ... }] }
 *
 * Falls back to: response.detail → err.message → fallback string
 */
export function extractApiError(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err || typeof err !== 'object') return fallback;

  // Axios / fetch wrapper — body is usually on err.response.data or err.data
  const body =
    (err as Record<string, unknown>).data ??
    ((err as Record<string, unknown>).response as Record<string, unknown> | undefined)?.data ??
    err;

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;

    // Structured validation errors: { errors: [{ msg, loc }] }
    if (Array.isArray(b.errors) && b.errors.length > 0) {
      return b.errors
        .map((e: Record<string, unknown>) => {
          const loc = Array.isArray(e.loc)
            ? e.loc.filter((s: unknown) => s !== 'body' && s !== 'query').join('.')
            : null;
          return loc ? `${loc}: ${e.msg}` : String(e.msg ?? fallback);
        })
        .join(' · ');
    }

    // Simple detail string
    if (typeof b.detail === 'string' && b.detail !== 'Validation Error') {
      return b.detail;
    }

    // Message field
    if (typeof b.message === 'string') return b.message;
  }

  // Native Error
  if (err instanceof Error) return err.message;

  return fallback;
}

/** Convenience: toast the extracted error */
import { toast } from 'sonner';
export function toastApiError(err: unknown, fallback = 'Something went wrong.'): void {
  toast.error(extractApiError(err, fallback));
}
