import { join } from 'node:path';
import { render } from 'ink-testing-library';
import type { ClaudeFileInfo } from '../../_types.js';
import { createClaudeFilePath } from '../../_types.js';
import { withCachedReadOnlyFixture } from '../../test-fixture-helpers.js';
import { createTestInteraction } from '../../test-interaction-helpers.js';
import { keyboard } from '../../test-keyboard-helpers.js';
import { delay } from '../../test-utils.js';
import { MenuActions } from './MenuActions/index.js';

if (import.meta.vitest) {
  const { describe, test, expect, vi } = import.meta.vitest;

  // Helper function: Create ClaudeFileInfo from file path
  const createFileInfo = (
    basePath: string,
    relativePath: string,
    type: ClaudeFileInfo['type'],
    overrides: Partial<ClaudeFileInfo> = {},
  ): ClaudeFileInfo => ({
    path: createClaudeFilePath(join(basePath, relativePath)),
    type,
    size: 1024,
    lastModified: new Date('2024-01-01'),
    commands: [],
    tags: [],
    ...overrides,
  });

  describe('MenuActions', () => {
    test('basic menu action display', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.md': '# CLAUDE.md',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain('📋 Actions');
          expect(lastFrame()).toContain('CLAUDE.md');
          expect(lastFrame()).toContain('[C] Copy Content');
          expect(lastFrame()).toContain('[P] Copy Path (Absolute)');
          expect(lastFrame()).toContain('[R] Copy Path (Relative)');
          expect(lastFrame()).toContain('[D] Copy to Current Directory');
          expect(lastFrame()).toContain('[E] Edit File');
          expect(lastFrame()).toContain('[O] Open File');
        },
      );
    });

    test('initial selection state display', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.md': '# CLAUDE.md',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          // First item is selected
          expect(lastFrame()).toContain('► [C] Copy Content');
        },
      );
    });

    test('keyboard navigation information display', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.md': '# CLAUDE.md',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain(
            '↑↓: Navigate | Enter: Execute | [Key]: Direct action | Esc: Close',
          );
        },
      );
    });

    test('display with different file types', async () => {
      await withCachedReadOnlyFixture(
        {
          project: {
            '.claude': {
              commands: {
                'test-command.md': '# /test-command\n\nTest command',
              },
            },
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'project/.claude/commands/test-command.md',
            'slash-command',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain('📋 Actions');
          expect(lastFrame()).toContain('test-command.md');
        },
      );
    });

    test('all actions exist', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.local.md': '# Local config',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.local.md',
            'claude-local-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          // Verify 6 actions are present
          expect(lastFrame()).toContain('[C] Copy Content');
          expect(lastFrame()).toContain('[P] Copy Path (Absolute)');
          expect(lastFrame()).toContain('[R] Copy Path (Relative)');
          expect(lastFrame()).toContain('[D] Copy to Current Directory');
          expect(lastFrame()).toContain('[E] Edit File');
          expect(lastFrame()).toContain('[O] Open File');
        },
      );
    });

    test('menu header information', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.md': '# CLAUDE.md',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();
          expect(output).toContain('📋 Actions');
          expect(output).toContain('CLAUDE.md');
        },
      );
    });

    test('menu action order', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test file',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();

          // Verify actions are displayed in correct order
          const copyContentIndex = output?.indexOf('[C] Copy Content') ?? -1;
          const copyAbsoluteIndex =
            output?.indexOf('[P] Copy Path (Absolute)') ?? -1;
          const copyRelativeIndex =
            output?.indexOf('[R] Copy Path (Relative)') ?? -1;
          const copyDirIndex =
            output?.indexOf('[D] Copy to Current Directory') ?? -1;
          const editFileIndex = output?.indexOf('[E] Edit File') ?? -1;
          const openFileIndex = output?.indexOf('[O] Open File') ?? -1;

          expect(copyContentIndex).toBeGreaterThan(-1);
          expect(copyAbsoluteIndex).toBeGreaterThan(copyContentIndex);
          expect(copyRelativeIndex).toBeGreaterThan(copyAbsoluteIndex);
          expect(copyDirIndex).toBeGreaterThan(copyRelativeIndex);
          expect(editFileIndex).toBeGreaterThan(copyDirIndex);
          expect(openFileIndex).toBeGreaterThan(editFileIndex);
        },
      );
    });

    test('long file path display', async () => {
      await withCachedReadOnlyFixture(
        {
          very: {
            long: {
              path: {
                to: {
                  project: {
                    '.claude': {
                      commands: {
                        'very-long-filename.md': '# Command',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'very/long/path/to/project/.claude/commands/very-long-filename.md',
            'slash-command',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain('very-long-filename.md');
        },
      );
    });

    test('file path with special characters display', async () => {
      await withCachedReadOnlyFixture(
        {
          'path with spaces & symbols': {
            'file with spaces & symbols.md': '# Special file',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'path with spaces & symbols/file with spaces & symbols.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain('file with spaces & symbols.md');
        },
      );
    });

    test('global config file display', async () => {
      await withCachedReadOnlyFixture(
        {
          '.claude': {
            'CLAUDE.md': '# Global config',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            '.claude/CLAUDE.md',
            'global-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          expect(lastFrame()).toContain('📋 Actions');
          expect(lastFrame()).toContain('CLAUDE.md');
        },
      );
    });

    test('menu layout structure', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();

          // Verify layout elements
          expect(output).toContain('📋 Actions');
          expect(output).toContain('► [C] Copy Content'); // Selection indicator
          expect(output).toContain('↑↓: Navigate'); // Help text
        },
      );
    });

    test('action description text verification', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();

          // Verify each action label
          expect(output).toContain('Copy Content');
          expect(output).toContain('Copy Path (Absolute)');
          expect(output).toContain('Copy Path (Relative)');
          expect(output).toContain('Copy to Current Directory');
          expect(output).toContain('Edit File');
          expect(output).toContain('Open File');
        },
      );
    });

    test('keyboard shortcut display', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();

          // Verify each action key binding
          expect(output).toContain('[C]');
          expect(output).toContain('[P]');
          expect(output).toContain('[R]');
          expect(output).toContain('[D]');
          expect(output).toContain('[E]');
          expect(output).toContain('[O]');
        },
      );
    });

    test('menu help section', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const output = lastFrame();

          // Verify each help text element
          expect(output).toContain('↑↓: Navigate');
          expect(output).toContain('Enter: Execute');
          expect(output).toContain('[Key]: Direct action');
          expect(output).toContain('Esc: Close');
        },
      );
    });

    test('display verification with different filenames', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'config.md': '# Config',
            'settings.md': '# Settings',
            '.claude': {
              commands: {
                'deploy.md': '# Deploy',
              },
            },
          },
        },
        async (fixture) => {
          const files = [
            createFileInfo(fixture.path, 'test-project/config.md', 'claude-md'),
            createFileInfo(
              fixture.path,
              'test-project/settings.md',
              'claude-local-md',
            ),
            createFileInfo(
              fixture.path,
              'test-project/.claude/commands/deploy.md',
              'slash-command',
            ),
          ];

          files.forEach((file) => {
            const onClose = vi.fn();
            const { lastFrame } = render(
              <MenuActions file={file} onClose={onClose} />,
            );

            expect(lastFrame()).toContain('📋 Actions');
            // Check that the filename is displayed
            const fileName = file.path.split('/').pop();
            expect(lastFrame()).toContain(fileName);
          });
        },
      );
    });

    test('menu rendering stability', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'file1.md': '# File 1',
            'file2.md': '# File 2',
          },
        },
        async (fixture) => {
          const file1 = createFileInfo(
            fixture.path,
            'test-project/file1.md',
            'claude-md',
          );
          const file2 = createFileInfo(
            fixture.path,
            'test-project/file2.md',
            'claude-local-md',
          );
          const onClose = vi.fn();

          const { lastFrame, rerender } = render(
            <MenuActions file={file1} onClose={onClose} />,
          );

          const output1 = lastFrame();
          expect(output1).toContain('file1.md');

          // Re-render with different file
          rerender(<MenuActions file={file2} onClose={onClose} />);

          const output2 = lastFrame();
          expect(output2).toContain('file2.md');
          expect(output2).toContain('[C] Copy Content');
        },
      );
    });

    test('keyboard interaction with menu', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'CLAUDE.md': '# CLAUDE.md',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/CLAUDE.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { stdin, lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          const interaction = createTestInteraction(stdin, lastFrame);

          // Navigate down through menu items
          await interaction.navigateDown(2);

          // Verify third item is selected (Copy Path Relative)
          const output = lastFrame();
          expect(output).toContain('► [R] Copy Path (Relative)');

          // Navigate back up
          await interaction.navigateUp();

          // Wait a bit more for the state to update
          await delay(50);

          // Verify second item is selected
          const output2 = lastFrame();
          expect(output2).toContain('► [P] Copy Path (Absolute)');
        },
      );
    });

    test('shortcut key interaction', async () => {
      await withCachedReadOnlyFixture(
        {
          'test-project': {
            'test.md': '# Test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'test-project/test.md',
            'claude-md',
          );
          const onClose = vi.fn();

          const { stdin, lastFrame } = render(
            <MenuActions file={file} onClose={onClose} />,
          );

          // Execute shortcut directly
          stdin.write(keyboard.shortcut.c);

          // In real implementation, this would trigger the copy action
          // Here we just verify the menu displays shortcut correctly
          const output = lastFrame();
          expect(output).toContain('[C] Copy Content');
        },
      );
    });
  });
}
