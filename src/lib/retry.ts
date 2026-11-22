export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const DEFAULT_OPTS: Required<Omit<RetryOptions, 'shouldRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 400,
  maxDelayMs: 4000,
};

function isRetryableFirestoreError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';
  if (code === 'permission-denied' || code === 'unauthenticated') return false;
  if (code === 'not-found' || code === 'invalid-argument') return false;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry với exponential backoff cho Firestore / network */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTS, ...options };
  const shouldRetry = options.shouldRetry ?? isRetryableFirestoreError;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts || !shouldRetry(err, attempt)) throw err;
      const wait = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await delay(wait);
    }
  }
  throw lastError;
}
