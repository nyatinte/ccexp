import { keyboard } from './keyboard-helpers.js';
import { waitForEffects } from './test-utils.js';

type TestStdin = { write: (data: string) => void };

type NavigateOptions = {
  async?: boolean;
  times?: number;
};

export const createNavigation = (stdin: TestStdin) => {
  const move = async (key: string, options: NavigateOptions = {}) => {
    const { async = false, times = 1 } = options;

    for (let i = 0; i < times; i++) {
      stdin.write(key);
      if (async) await waitForEffects();
    }
  };

  return {
    up: (options?: NavigateOptions) => move(keyboard.arrowUp, options),
    down: (options?: NavigateOptions) => move(keyboard.arrowDown, options),
    left: (options?: NavigateOptions) => move(keyboard.arrowLeft, options),
    right: (options?: NavigateOptions) => move(keyboard.arrowRight, options),
    enter: (options?: NavigateOptions) =>
      move(keyboard.enter, { ...options, times: 1 }),
    escape: (options?: NavigateOptions) =>
      move(keyboard.escape, { ...options, times: 1 }),
    tab: (options?: NavigateOptions) =>
      move(keyboard.tab, { ...options, times: 1 }),
  };
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect, vi } = import.meta.vitest;

  describe('createNavigation', () => {
    test('sync navigation writes keys immediately', () => {
      const stdin = { write: vi.fn() };
      const nav = createNavigation(stdin);

      nav.down({ times: 3 });

      expect(stdin.write).toHaveBeenCalledTimes(3);
      expect(stdin.write).toHaveBeenCalledWith('\x1B[B');
    });

    test('async navigation waits for effects', async () => {
      const stdin = { write: vi.fn() };
      const nav = createNavigation(stdin);

      await nav.up({ async: true, times: 2 });

      expect(stdin.write).toHaveBeenCalledTimes(2);
      expect(stdin.write).toHaveBeenCalledWith('\x1B[A');
    });

    test('single key presses work correctly', async () => {
      const stdin = { write: vi.fn() };
      const nav = createNavigation(stdin);

      await nav.enter({ async: true });
      expect(stdin.write).toHaveBeenCalledTimes(1);
      expect(stdin.write).toHaveBeenCalledWith('\r');

      stdin.write.mockClear();
      await nav.escape();
      expect(stdin.write).toHaveBeenCalledTimes(1);
      expect(stdin.write).toHaveBeenCalledWith('\x1B');
    });
  });
}
