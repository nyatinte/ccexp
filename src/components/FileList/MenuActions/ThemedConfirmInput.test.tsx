import { render } from 'ink-testing-library';
import { vi } from 'vitest';
import { keyboard } from '../../../test-keyboard-helpers.js';
import { delay } from '../../../test-utils.js';
import { ThemedConfirmInput } from './ThemedConfirmInput.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('ThemedConfirmInput', () => {
    test('renders with custom theme', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Are you sure?';

      const { lastFrame } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(lastFrame()).toContain(message);
      expect(lastFrame()).toContain('Press');
      expect(lastFrame()).toContain('Y');
      expect(lastFrame()).toContain('to confirm or');
      expect(lastFrame()).toContain('n');
      expect(lastFrame()).toContain('to cancel:');
    });

    test('displays prompt text and colored hints', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Delete this file?';

      const { lastFrame } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      const output = lastFrame();
      expect(output).toContain('Delete this file?');
      // The colored "Y" and "n" are rendered with color attributes
      expect(output).toContain('Y');
      expect(output).toContain('n');
    });

    test('pressing Y triggers onConfirm', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('Y');
      await delay(50);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    test('pressing n triggers onCancel', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('n');
      await delay(50);

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('pressing lowercase y triggers onConfirm', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('y');
      await delay(50);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    test('pressing uppercase N triggers onCancel', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('N');
      await delay(50);

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('pressing Enter triggers default choice (cancel)', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write(keyboard.enter);
      await delay(50);

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('multiple prompts render correctly', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      const messages = [
        'Are you sure?',
        'Really delete this file?',
        'This action cannot be undone. Continue?',
      ];

      messages.forEach((message) => {
        const { lastFrame } = render(
          <ThemedConfirmInput
            message={message}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />,
        );

        expect(lastFrame()).toContain(message);
        expect(lastFrame()).toContain('Y');
        expect(lastFrame()).toContain('n');
      });
    });

    test('component renders with different message lengths', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      const shortMessage = 'OK?';
      const longMessage =
        'This is a very long confirmation message that should still be displayed correctly';

      const { lastFrame: shortFrame } = render(
        <ThemedConfirmInput
          message={shortMessage}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(shortFrame()).toContain(shortMessage);

      const { lastFrame: longFrame } = render(
        <ThemedConfirmInput
          message={longMessage}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(longFrame()).toContain(longMessage);
    });

    test('callbacks are not called without user input', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      await delay(100);

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    test('invalid keys do not trigger callbacks', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('x');
      stdin.write('1');
      stdin.write(' ');
      await delay(50);

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });

    test('component unmounts cleanly', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { unmount } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    test('re-render with different message', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message1 = 'First question?';
      const message2 = 'Second question?';

      const { lastFrame, rerender } = render(
        <ThemedConfirmInput
          message={message1}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(lastFrame()).toContain(message1);

      rerender(
        <ThemedConfirmInput
          message={message2}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      expect(lastFrame()).toContain(message2);
      expect(lastFrame()).not.toContain(message1);
    });

    test('layout structure is correct', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Test message';

      const { lastFrame } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      const output = lastFrame();
      // Message appears before the key hints
      const messageIndex = output?.indexOf(message) ?? -1;
      const pressIndex = output?.indexOf('Press') ?? -1;
      expect(messageIndex).toBeGreaterThan(-1);
      expect(pressIndex).toBeGreaterThan(messageIndex);
    });

    test('component state after action', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      const message = 'Confirm action?';

      const { stdin, unmount } = render(
        <ThemedConfirmInput
          message={message}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />,
      );

      stdin.write('Y');
      await delay(50);

      expect(onConfirm).toHaveBeenCalledTimes(1);

      // Component should still be renderable after action
      expect(() => unmount()).not.toThrow();
    });
  });
}
