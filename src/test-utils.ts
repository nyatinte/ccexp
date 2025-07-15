/**
 * Test utilities for async operations
 */
import { delay } from 'es-toolkit/promise';

// Re-export delay from es-toolkit for backward compatibility
export { delay };

/**
 * Wait for React effects to complete
 * Useful for testing components with useEffect
 */
export const waitForEffects = () => delay(10);

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
}
