import { logger } from "./logger";

export class PettingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PettingError";
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
          { error: error instanceof Error ? error.message : String(error) }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new PettingError(
    `Failed after ${maxRetries} attempts`,
    lastError!
  );
}

