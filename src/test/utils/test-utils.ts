/**
 * Test utilities for async operations
 */
import { delay } from 'es-toolkit/promise';

/**
 * Wait for React effects to complete
 * Useful for testing components with useEffect
 */
export const waitForEffects = () => delay(10);

/**
 * Waits for a condition to be satisfied, repeatedly checking at intervals.
 *
 * @param condition - A function that throws an error if the condition is not met
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 * @param interval - How often to check the condition in milliseconds (default: 50)
 * @returns Promise that resolves when condition passes or rejects on timeout
 *
 * @see https://github.com/vadimdemedes/ink-testing-library/pull/27
 * @example
 * await waitFor(() => {
 *   const output = lastFrame();
 *   if (!output.includes('Expected text')) {
 *     throw new Error('Text not found');
 *   }
 * });
 */
export async function waitFor(
  condition: () => void,
  timeout = 3000,
  interval = 50,
): Promise<void> {
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      condition();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await delay(interval);
    }
  }

  throw new Error(
    `waitFor timed out after ${timeout}ms\n${lastError ? `Last error: ${lastError.message}` : ''}`,
  );
}

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('delay', () => {
    test('should wait for specified time', async () => {
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow for timer precision
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('waitFor', () => {
    test('should resolve immediately when condition is met', async () => {
      // Simply verify it resolves without error
      await waitFor(() => {
        // Condition is immediately satisfied
      });
    });

    test('should timeout when condition is never met', async () => {
      await expect(
        waitFor(
          () => {
            throw new Error('Always fails');
          },
          100,
          30,
        ),
      ).rejects.toThrow(
        'waitFor timed out after 100ms\nLast error: Always fails',
      );
    });

    test('should include last error message in timeout error', async () => {
      await expect(
        waitFor(() => {
          throw new Error('Custom error message');
        }, 100),
      ).rejects.toThrow('Custom error message');
    });

    test('should work with async conditions', async () => {
      let ready = false;
      // Set ready to true after a short delay
      setTimeout(() => {
        ready = true;
      }, 50);

      await waitFor(() => {
        if (!ready) {
          throw new Error('Not ready');
        }
      });

      expect(ready).toBe(true);
    });
  });
}
