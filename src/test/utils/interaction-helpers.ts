import { isArray } from 'es-toolkit/compat';
import { keyboard, typeText } from './keyboard-helpers.js';
import { createNavigation } from './navigation.js';
import { waitFor, waitForEffects } from './test-utils.js';

// Type for stdin mock object from ink-testing-library
type TestStdin = {
  write: (data: string) => void;
};

/**
 * Create test interaction helper for React Ink components
 * Provides high-level methods for common user interactions
 */
export const createTestInteraction = (
  stdin: TestStdin,
  lastFrame: () => string | undefined,
) => {
  const nav = createNavigation(stdin);

  /**
   * Navigate using arrow keys (async versions)
   */
  const navigateUp = (times = 1) => nav.up({ async: true, times });
  const navigateDown = (times = 1) => nav.down({ async: true, times });
  const navigateLeft = (times = 1) => nav.left({ async: true, times });
  const navigateRight = (times = 1) => nav.right({ async: true, times });

  /**
   * Select current item with Enter
   */
  const selectItem = () => nav.enter({ async: true });

  /**
   * Cancel/exit with Escape
   */
  const exitMode = () => nav.escape({ async: true });

  /**
   * Type search query
   */
  const search = async (query: string) => {
    typeText(stdin, query);
    await waitForEffects();
  };

  /**
   * Clear search by pressing Escape
   */
  const clearSearch = async () => {
    stdin.write(keyboard.escape);
    await waitForEffects();
  };

  /**
   * Execute menu action by shortcut key
   */
  const executeShortcut = async (key: keyof typeof keyboard.shortcut) => {
    stdin.write(keyboard.shortcut[key]);
    await waitForEffects();
  };

  /**
   * Verify content exists in current frame
   */
  const verifyContent = (expected: string | string[]) => {
    const output = lastFrame();
    const expectations = isArray(expected) ? expected : [expected];

    for (const exp of expectations) {
      expect(output).toContain(exp);
    }
  };

  /**
   * Verify content does not exist in current frame
   */
  const verifyNotContent = (unexpected: string | string[]) => {
    const output = lastFrame();
    const unexpectations = isArray(unexpected) ? unexpected : [unexpected];

    for (const unexp of unexpectations) {
      expect(output).not.toContain(unexp);
    }
  };

  /**
   * Get current frame output
   */
  const getOutput = (): string | undefined => {
    return lastFrame();
  };

  /**
   * Verify and return output (for chaining assertions)
   */
  const assertOutput = (): string => {
    const output = lastFrame();
    expect(output).toBeDefined();
    return output as string;
  };

  /**
   * Wait for specific content to appear
   */
  const waitForContent = async (
    text: string,
    timeout?: number,
    interval?: number,
  ) => {
    await waitFor(
      () => {
        const output = lastFrame();
        if (!output || !output.includes(text)) {
          throw new Error(`Content "${text}" not found in output`);
        }
      },
      timeout,
      interval,
    );
  };

  /**
   * Wait for specific content to disappear
   */
  const waitForNotContent = async (
    text: string,
    timeout?: number,
    interval?: number,
  ) => {
    await waitFor(
      () => {
        const output = lastFrame();
        if (output?.includes(text)) {
          throw new Error(`Content "${text}" still present in output`);
        }
      },
      timeout,
      interval,
    );
  };

  return {
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    selectItem,
    escape: exitMode,
    search,
    clearSearch,
    executeShortcut,
    verifyContent,
    verifyNotContent,
    getOutput,
    assertOutput,
    waitForContent,
    waitForNotContent,
  };
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect, vi } = import.meta.vitest;

  describe('createTestInteraction', () => {
    const createMockSetup = () => {
      const stdin = { write: vi.fn() };
      const lastFrame = vi.fn().mockReturnValue('Test content');
      const interaction = createTestInteraction(stdin, lastFrame);
      return { stdin, lastFrame, interaction };
    };

    test('navigation methods write correct keys', async () => {
      const { stdin, interaction } = createMockSetup();

      await interaction.navigateDown(2);
      expect(stdin.write).toHaveBeenCalledTimes(2);
      expect(stdin.write).toHaveBeenCalledWith('\x1B[B');

      stdin.write.mockClear();
      await interaction.navigateUp();
      expect(stdin.write).toHaveBeenCalledTimes(1);
      expect(stdin.write).toHaveBeenCalledWith('\x1B[A');
    });

    test('search types text correctly', async () => {
      const { stdin, interaction } = createMockSetup();

      await interaction.search('test query');
      expect(stdin.write).toHaveBeenCalledTimes(10); // 'test query' = 10 chars
      expect(stdin.write).toHaveBeenNthCalledWith(1, 't');
      expect(stdin.write).toHaveBeenNthCalledWith(2, 'e');
      expect(stdin.write).toHaveBeenNthCalledWith(3, 's');
      expect(stdin.write).toHaveBeenNthCalledWith(4, 't');
    });

    test('verifyContent checks frame content', () => {
      const { lastFrame, interaction } = createMockSetup();
      lastFrame.mockReturnValue('Hello World');

      // Should not throw
      interaction.verifyContent('Hello');
      interaction.verifyContent(['Hello', 'World']);

      // Should throw
      expect(() => interaction.verifyContent('Goodbye')).toThrow();
    });

    test('verifyNotContent checks absence of content', () => {
      const { lastFrame, interaction } = createMockSetup();
      lastFrame.mockReturnValue('Hello World');

      // Should not throw
      interaction.verifyNotContent('Goodbye');
      interaction.verifyNotContent(['Foo', 'Bar']);

      // Should throw
      expect(() => interaction.verifyNotContent('Hello')).toThrow();
    });

    test('executeShortcut sends correct key', async () => {
      const { stdin, interaction } = createMockSetup();

      await interaction.executeShortcut('c');
      expect(stdin.write).toHaveBeenCalledWith('c');

      stdin.write.mockClear();
      await interaction.executeShortcut('p');
      expect(stdin.write).toHaveBeenCalledWith('p');
    });
  });
}
