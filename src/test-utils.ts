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
      const start = Date.now();
      await waitFor(() => {
        // Condition is immediately satisfied
      });
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50); // Should resolve without waiting
    });

    test('should wait until condition is met', async () => {
      let counter = 0;
      const start = Date.now();

      await waitFor(() => {
        counter++;
        if (counter < 3) {
          throw new Error('Not ready yet');
        }
      });

      const elapsed = Date.now() - start;
      expect(counter).toBe(3);
      expect(elapsed).toBeGreaterThanOrEqual(100); // Should wait at least 2 intervals
      expect(elapsed).toBeLessThan(200);
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

    test('should use custom timeout and interval', async () => {
      let checkCount = 0;
      const start = Date.now();

      await expect(
        waitFor(
          () => {
            checkCount++;
            throw new Error('Not ready');
          },
          200,
          40,
        ),
      ).rejects.toThrow();

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(elapsed).toBeLessThan(500); // Allow much more margin for CI environments
      // With 200ms timeout and 40ms interval, should check ~5 times
      // Allow more margin for slow test environments
      expect(checkCount).toBeGreaterThanOrEqual(3);
      expect(checkCount).toBeLessThanOrEqual(7);
    });
  });
}
