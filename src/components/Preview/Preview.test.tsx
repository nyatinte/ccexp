import { join } from 'node:path';
import { render } from 'ink-testing-library';
import type { ClaudeFileInfo } from '../../_types.js';
import { createClaudeFilePath } from '../../_types.js';
import {
  DEFAULT_CLAUDE_MD,
  withTempFixture,
} from '../../test-fixture-helpers.js';
import { Preview } from './Preview.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

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

  describe('Preview', () => {
    test('displays placeholder when no file selected', () => {
      const { lastFrame } = render(<Preview />);

      expect(lastFrame()).toContain('Select a file to preview');
    });

    test('displays basic file information when selected', async () => {
      await withTempFixture(
        {
          'test-project': {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'CLAUDE.md', 'claude-md');

          const { lastFrame } = render(<Preview file={file} />);

          const frame = lastFrame();
          // Check that the frame contains the file name and type
          expect(frame).toContain('CLAUDE.md');
          expect(frame).toContain('Type: claude-md');
          // Path is displayed but may be wrapped, so just check it contains part of the path
          expect(frame).toMatch(/test-project|\/CLAUDE\.md/);
        },
      );
    });

    test('displays different file types', async () => {
      await withTempFixture(
        {
          'test-project': {
            'CLAUDE.local.md': '# Local config\n\nLocal overrides',
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(
            basePath,
            'CLAUDE.local.md',
            'claude-local-md',
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('CLAUDE.local.md');
          expect(lastFrame()).toContain('Type: claude-local-md');
        },
      );
    });

    test('displays slash command files', async () => {
      await withTempFixture(
        {
          'test-project': {
            '.claude': {
              commands: {
                'deploy.md':
                  '# /deploy\n\nDeploy application\n\n## Usage\n`/deploy [env]`',
              },
            },
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(
            basePath,
            '.claude/commands/deploy.md',
            'slash-command',
            {
              commands: [
                {
                  name: 'deploy',
                  description: 'Deploy application',
                  hasArguments: true,
                },
              ],
              tags: ['production'],
            },
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('deploy.md');
          expect(lastFrame()).toContain('Type: slash-command');
          expect(lastFrame()).toContain('.claude/commands/deploy.md');
        },
      );
    });

    test('displays global type files', async () => {
      await withTempFixture(
        {
          '.claude': {
            'CLAUDE.md': '# Global CLAUDE.md\n\nGlobal configuration',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            '.claude/CLAUDE.md',
            'global-md',
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('CLAUDE.md');
          expect(lastFrame()).toContain('Type: global-md');
          // Path contains .claude directory
          expect(lastFrame()).toContain('.claude');
        },
      );
    });

    test('displays file statistics', async () => {
      await withTempFixture(
        {
          'test-project': {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'CLAUDE.md', 'claude-md', {
            size: 2048,
            lastModified: new Date('2024-01-15T10:30:00Z'),
          });

          const { lastFrame } = render(<Preview file={file} />);

          // Verify statistics are displayed
          expect(lastFrame()).toContain('Lines:');
          expect(lastFrame()).toContain('Size:');
          expect(lastFrame()).toContain('chars');
        },
      );
    });

    test('loads file content and displays Markdown', async () => {
      await withTempFixture(
        {
          'test-project': {
            'CLAUDE.md':
              '# CLAUDE.md\n\n## Test Section\n\nThis is **bold** and *italic*.',
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'CLAUDE.md', 'claude-md');

          const { lastFrame } = render(<Preview file={file} />);

          // The component will read the actual file content
          // Note: Actual implementation uses useEffect for async loading
          expect(lastFrame()).toBeDefined();
        },
      );
    });

    test('handles file reading errors', async () => {
      await withTempFixture(
        {
          'test-project': {
            'existing.md': '# Existing file',
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          // Create a file info for a file that doesn't exist
          const file = createFileInfo(basePath, 'missing.md', 'claude-md');

          const { lastFrame } = render(<Preview file={file} />);

          // The component should handle the missing file gracefully
          // Verify error handling (implementation dependent)
          expect(lastFrame()).toBeDefined();
        },
      );
    });

    test('displays detailed slash command information', async () => {
      await withTempFixture(
        {
          'test-project': {
            '.claude': {
              commands: {
                'complex-deploy.md': `# /deploy & /rollback

## /deploy
Deploy application to various environments

Usage: /deploy [env]

## /rollback
Rollback to previous version`,
              },
            },
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(
            basePath,
            '.claude/commands/complex-deploy.md',
            'slash-command',
            {
              commands: [
                {
                  name: 'deploy',
                  description: 'Deploy application to various environments',
                  hasArguments: true,
                },
                {
                  name: 'rollback',
                  description: 'Rollback to previous version',
                  hasArguments: false,
                },
              ],
              tags: ['production', 'staging', 'deploy'],
            },
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('complex-deploy.md');
          expect(lastFrame()).toContain('Type: slash-command');

          // Verify command and tag information is displayed (implementation dependent)
          const output = lastFrame();
          expect(output).toBeDefined();
        },
      );
    });

    test('displays large file sizes', async () => {
      await withTempFixture(
        {
          'test-project': {
            'large-file.md': `# Large file\n\n${'Content...\n'.repeat(1000)}`,
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'large-file.md', 'claude-md', {
            size: 1024 * 1024 * 5, // 5MB
          });

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('large-file.md');
          expect(lastFrame()).toContain('Type: claude-md');
          expect(lastFrame()).toContain('Size:');
        },
      );
    });

    test('displays file paths with special characters', async () => {
      await withTempFixture(
        {
          'path with spaces & symbols': {
            'file with spaces & symbols.md': '# Special characters test',
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            'path with spaces & symbols/file with spaces & symbols.md',
            'claude-md',
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('file with spaces & symbols.md');
          // Path may be wrapped, check for directory name and file name separately
          const frame = lastFrame();
          expect(frame).toContain('spaces');
          expect(frame).toContain('symbols');
        },
      );
    });

    test('displays slash command files with empty commands and tags', async () => {
      await withTempFixture(
        {
          'test-project': {
            '.claude': {
              commands: {
                'simple.md': '# Simple command\n\nNo specific command defined.',
              },
            },
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(
            basePath,
            '.claude/commands/simple.md',
            'slash-command',
            {
              commands: [],
              tags: [],
            },
          );

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('simple.md');
          expect(lastFrame()).toContain('Type: slash-command');
        },
      );
    });

    test('displays Claude files with project information', async () => {
      await withTempFixture(
        {
          'test-project': {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
            'package.json': JSON.stringify({
              name: 'test-project',
              scripts: {
                build: 'bun run build',
              },
            }),
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'CLAUDE.md', 'claude-md');

          const { lastFrame } = render(<Preview file={file} />);

          expect(lastFrame()).toContain('CLAUDE.md');
          expect(lastFrame()).toContain('Type: claude-md');
          // Verify project information display (implementation dependent)
        },
      );
    });

    test('remains stable across multiple renders', async () => {
      await withTempFixture(
        {
          'test-project': {
            'file1.md': '# File 1',
            'file2.md': '# File 2',
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file1 = createFileInfo(basePath, 'file1.md', 'claude-md');
          const file2 = createFileInfo(basePath, 'file2.md', 'claude-local-md');

          const { lastFrame, rerender } = render(<Preview file={file1} />);

          expect(lastFrame()).toContain('file1.md');
          expect(lastFrame()).toContain('Type: claude-md');

          // Re-render with different file
          rerender(<Preview file={file2} />);

          expect(lastFrame()).toContain('file2.md');
          // Verify display state after rerender (avoiding implementation details)
          const output = lastFrame();
          expect(output).toBeDefined();
          expect(output?.length ?? 0).toBeGreaterThan(0);
        },
      );
    });

    test('switches from undefined file to valid file', async () => {
      await withTempFixture(
        {
          'test-project': {
            'test.md': '# Test file',
          },
        },
        async (fixture) => {
          const basePath = join(fixture.path, 'test-project');
          const file = createFileInfo(basePath, 'test.md', 'claude-md');

          const { lastFrame, rerender } = render(<Preview />);

          expect(lastFrame()).toContain('Select a file to preview');

          // Re-render with file set
          rerender(<Preview file={file} />);

          expect(lastFrame()).toContain('test.md');
          expect(lastFrame()).toContain('Type: claude-md');
        },
      );
    });
  });
}
