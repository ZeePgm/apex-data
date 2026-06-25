/**
 * Generic retry utility with exponential backoff.
 * Used by Tracker.gg and Mozambique API services to handle
 * transient failures (5xx, 429, network errors).
 *
 * @see https://cloud.google.com/blog/products/api-management/exponential-backoff
 */

export interface RetryOptions {
  maxRetries?: number // default 3
  baseDelayMs?: number // default 1000
  maxDelayMs?: number // default 15000
  /** Status codes that should trigger a retry (e.g. 429, 5xx) */
  retryableStatuses?: number[]
}

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 15000,
  retryableStatuses: [429, 500, 502, 503, 504],
}

export class RetryExhaustedError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly lastError: string,
  ) {
    super(`All ${attempts} retry attempts exhausted. Last error: ${lastError}`)
    this.name = "RetryExhaustedError"
  }
}

/**
 * Execute `fn` with exponential backoff retry.
 *
 * On each retryable failure:
 *   delay = min(baseDelay * 2^attempt, maxDelay) + random jitter
 *
 * Non-retryable errors (e.g. 404, 403) are thrown immediately.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryableStatuses } = {
    ...DEFAULTS,
    ...opts,
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err as Error

      // Only retry UpstreamHttpError with retryable statuses (429, 5xx)
      // and AbortError (timeout). All other errors are non-retryable.
      if (err instanceof UpstreamHttpError) {
        if (!retryableStatuses.includes(err.status)) {
          throw err // non-retryable HTTP status (e.g. 403, 404 handled upstream)
        }
        // retryable: 429, 500, 502, 503, 504
      } else if ((err as Error).name === "AbortError") {
        // Timeout — retryable
      } else {
        // Custom errors (PlayerNotFoundError, UpstreamError, etc.) — non-retryable
        throw err
      }

      if (attempt >= maxRetries) {
        throw new RetryExhaustedError(
          attempt + 1,
          lastError?.message ?? "unknown",
        )
      }

      // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
        maxDelayMs,
      )
      console.warn(
        `[retry] attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms: ${lastError?.message}`,
      )
      await sleep(delay)
    }
  }

  // Should be unreachable, but TypeScript needs it
  throw lastError ?? new Error("Retry failed with unknown error")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Error thrown by fetch wrappers when upstream returns a non-ok status.
 * `status` is used by withRetry to decide retryability.
 */
export class UpstreamHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "UpstreamHttpError"
  }
}
