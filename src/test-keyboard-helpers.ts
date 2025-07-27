/**
 * Keyboard input constants for testing React Ink components
 * Makes test code more readable by providing named constants for escape sequences
 */

export const keyboard = {
  // Arrow keys
  arrowUp: '\x1B[A',
  arrowDown: '\x1B[B',
  arrowRight: '\x1B[C',
  arrowLeft: '\x1B[D',

  // Control keys
  enter: '\r',
  escape: '\x1B',
  space: ' ',
  tab: '\t',
  backspace: '\x7F',
  delete: '\x1B[3~',

  // Function keys
  f1: '\x1BOP',
  f2: '\x1BOQ',
  f3: '\x1BOR',
  f4: '\x1BOS',

  // Page navigation
  pageUp: '\x1B[5~',
  pageDown: '\x1B[6~',
  home: '\x1B[H',
  end: '\x1B[F',

  // Modifiers with letters (Ctrl+key)
  ctrl: {
    a: '\x01',
    c: '\x03',
    d: '\x04',
    e: '\x05',
    f: '\x06',
    k: '\x0B',
    l: '\x0C',
    n: '\x0E',
    p: '\x10',
    u: '\x15',
    w: '\x17',
  },

  // Menu shortcuts (single letters)
  shortcut: {
    c: 'c',
    p: 'p',
    r: 'r',
    d: 'd',
    o: 'o',
  },
} as const;

// Type for stdin mock object from ink-testing-library
type TestStdin = {
  write: (data: string) => void;
};

/**
 * Type text character by character into stdin
 */
export const typeText = (stdin: TestStdin, text: string): void => {
  for (const char of text) {
    stdin.write(char);
  }
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect, vi } = import.meta.vitest;

  describe('keyboard helpers', () => {
    test('keyboard constants have correct escape sequences', () => {
      expect(keyboard.arrowUp).toBe('\x1B[A');
      expect(keyboard.arrowDown).toBe('\x1B[B');
      expect(keyboard.enter).toBe('\r');
      expect(keyboard.escape).toBe('\x1B');
    });

    test('typeText writes each character', () => {
      const stdin = { write: vi.fn() };
      typeText(stdin, 'hello');

      expect(stdin.write).toHaveBeenCalledTimes(5);
      expect(stdin.write).toHaveBeenNthCalledWith(1, 'h');
      expect(stdin.write).toHaveBeenNthCalledWith(2, 'e');
      expect(stdin.write).toHaveBeenNthCalledWith(3, 'l');
      expect(stdin.write).toHaveBeenNthCalledWith(4, 'l');
      expect(stdin.write).toHaveBeenNthCalledWith(5, 'o');
    });
  });
}
