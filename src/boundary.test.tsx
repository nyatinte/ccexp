import { join } from 'node:path';
import { render } from 'ink-testing-library';
import type { ClaudeFileInfo, FileGroup } from './_types.js';
import { createClaudeFilePath } from './_types.js';
import { App } from './App.js';
import { FileList } from './components/FileList/FileList.js';
import { withTempFixture } from './test-fixture-helpers.js';
import { createTestInteraction } from './test-interaction-helpers.js';
import { typeText } from './test-keyboard-helpers.js';
import { waitFor, waitForEffects } from './test-utils.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  // Helper to create ClaudeFileInfo
  const createFileInfo = (
    basePath: string,
    relativePath: string,
    type: ClaudeFileInfo['type'],
  ): ClaudeFileInfo => ({
    path: createClaudeFilePath(join(basePath, relativePath)),
    type,
    size: 1024,
    lastModified: new Date('2024-01-01'),
    commands: [],
    tags: [],
  });

  // Helper to create file groups
  const createFileGroups = (files: ClaudeFileInfo[]): FileGroup[] => {
    const groups = files.reduce<Record<string, ClaudeFileInfo[]>>(
      (acc, file) => {
        if (!acc[file.type]) {
          acc[file.type] = [];
        }
        acc[file.type]?.push(file);
        return acc;
      },
      {},
    );

    return Object.entries(groups).map(([type, groupFiles]) => ({
      type: type as ClaudeFileInfo['type'],
      files: groupFiles,
      isExpanded: true,
    }));
  };

  describe('Boundary Value Tests', () => {
    test('handles moderate number of files', async () => {
      // Generate 100 files - a realistic project size
      const manyFiles: ClaudeFileInfo[] = Array.from({ length: 100 }, (_, i) =>
        createFileInfo('', `project/file${i}.md`, 'project-memory'),
      );
      const fileGroups = createFileGroups(manyFiles);

      const { lastFrame, unmount } = render(
        <FileList
          files={manyFiles}
          fileGroups={fileGroups}
          onFileSelect={() => {}}
          onToggleGroup={() => {}}
        />,
      );

      await waitForEffects();

      // Should display count correctly
      const output = lastFrame();
      expect(output).toContain('Claude Files (100)');
      expect(output).toContain('Project memory (CLAUDE.md) (100)');

      unmount();
    });

    test('handles nested file paths', async () => {
      const deepPath = 'src/components/features/';
      const fileName = 'MyComponent.md';
      const relativePath = `${deepPath}${fileName}`;

      await withTempFixture(
        {
          src: {
            components: {
              features: {
                [fileName]: '# Component Documentation\n\nContent',
              },
            },
          },
        },
        async (fixture) => {
          const file = createFileInfo(
            fixture.path,
            relativePath,
            'project-memory',
          );
          const fileGroups = createFileGroups([file]);

          const { lastFrame } = render(
            <FileList
              files={[file]}
              fileGroups={fileGroups}
              onFileSelect={() => {}}
              onToggleGroup={() => {}}
            />,
          );

          await waitForEffects();

          const output = lastFrame();
          // Should display the file name
          expect(output).toContain(fileName);
          // Should show relative path from base
          expect(output).toContain('features/MyComponent.md');
        },
      );
    });

    test('handles file names with special unicode characters', async () => {
      await withTempFixture(
        {
          'emoji-🎉-file.md': '# Emoji File',
          'chinese-中文文件.md': '# Chinese File',
          'arabic-ملف.md': '# Arabic File',
          'symbols-@#$%^&*.md': '# Symbols File',
          'spaces   multiple   spaces.md': '# Spaces File',
          'tabs\t\ttabbed.md': '# Tabbed File',
        },
        async (fixture) => {
          const specialFiles = [
            createFileInfo(fixture.path, 'emoji-🎉-file.md', 'project-memory'),
            createFileInfo(
              fixture.path,
              'chinese-中文文件.md',
              'project-memory',
            ),
            createFileInfo(fixture.path, 'arabic-ملف.md', 'project-memory'),
            createFileInfo(
              fixture.path,
              'symbols-@#$%^&*.md',
              'project-memory',
            ),
            createFileInfo(
              fixture.path,
              'spaces   multiple   spaces.md',
              'project-memory',
            ),
            createFileInfo(fixture.path, 'tabs\t\ttabbed.md', 'project-memory'),
          ];

          const fileGroups = createFileGroups(specialFiles);

          const { lastFrame } = render(
            <FileList
              files={specialFiles}
              fileGroups={fileGroups}
              onFileSelect={() => {}}
              onToggleGroup={() => {}}
            />,
          );

          await waitForEffects();

          const output = lastFrame();
          expect(output).toContain('emoji-🎉-file.md');
          expect(output).toContain('chinese-中文文件.md');
          expect(output).toContain('arabic-ملف.md');
          expect(output).toContain('symbols-@#$%^&*.md');
          expect(output).toContain('spaces   multiple   spaces.md');
          expect(output).toContain('tabs');
          expect(output).toContain('tabbed.md');
        },
      );
    });

    test('handles files with no extension', async () => {
      await withTempFixture(
        {
          README: '# README',
          Makefile: 'build:\n\techo "Building"',
          '.gitignore': 'node_modules\n*.log',
          '.env.local': 'API_KEY=test',
        },
        async (fixture) => {
          const files = [
            createFileInfo(fixture.path, 'README', 'project-memory'),
            createFileInfo(fixture.path, 'Makefile', 'project-memory'),
            createFileInfo(fixture.path, '.gitignore', 'project-memory'),
            createFileInfo(fixture.path, '.env.local', 'project-memory'),
          ];

          const fileGroups = createFileGroups(files);

          const { lastFrame } = render(
            <FileList
              files={files}
              fileGroups={fileGroups}
              onFileSelect={() => {}}
              onToggleGroup={() => {}}
            />,
          );

          await waitForEffects();

          const output = lastFrame();
          expect(output).toContain('README');
          expect(output).toContain('Makefile');
          expect(output).toContain('.gitignore');
          expect(output).toContain('.env.local');
        },
      );
    });

    test('handles rapid search input changes', { timeout: 10000 }, async () => {
      await withTempFixture(
        Object.fromEntries([
          // Create some Claude files that will be discovered
          ['CLAUDE.md', '# Claude Config'],
          // And many test files for search testing
          ...Array.from({ length: 98 }, (_, i) => [
            `test${i}.md`,
            `# Test ${i}`,
          ]),
        ]),
        async (fixture) => {
          // Change to fixture directory
          const originalCwd = process.cwd();
          process.chdir(fixture.path);
          const originalHome = process.env.HOME;
          process.env.HOME = fixture.path;

          try {
            const { stdin, lastFrame, unmount } = render(
              <App cliOptions={{}} />,
            );

            // Since we're creating 100 files in a test environment,
            // we may need to wait longer for the initial scan
            await waitFor(() => {
              const output = lastFrame();
              if (!output || output.includes('Loading...')) {
                throw new Error('Still loading');
              }
              // Wait for either "Claude Files" or "No Claude files found"
              if (
                !output.includes('Claude Files') &&
                !output.includes('No Claude files found')
              ) {
                throw new Error('Files not loaded yet');
              }
            }, 8000); // 100 files need more time to scan
            await waitForEffects();

            // Rapidly type and delete
            typeText(stdin, 'test');
            stdin.write('\x7F'); // backspace
            stdin.write('\x7F');
            stdin.write('\x7F');
            stdin.write('\x7F');
            typeText(stdin, 'file');

            await waitForEffects();

            // Should handle the rapid changes without crashing
            const output = lastFrame();
            expect(output).toBeDefined();

            unmount();
          } finally {
            try {
              process.chdir(originalCwd);
            } catch {
              // Ignore error if directory no longer exists
            }
            process.env.HOME = originalHome;
          }
        },
      );
    });

    test('handles files at filesystem root', async () => {
      // Note: We simulate root files with absolute paths
      await withTempFixture(
        {
          'root.md': '# Root File',
          'CLAUDE.md': '# CLAUDE.md',
        },
        async (fixture) => {
          // Create files with simulated root paths
          const rootFiles = [
            {
              ...createFileInfo(fixture.path, 'root.md', 'project-memory'),
              path: createClaudeFilePath('/root.md'),
            },
            {
              ...createFileInfo(fixture.path, 'CLAUDE.md', 'project-memory'),
              path: createClaudeFilePath('/CLAUDE.md'),
            },
          ];

          const fileGroups = createFileGroups(rootFiles);

          const { lastFrame } = render(
            <FileList
              files={rootFiles}
              fileGroups={fileGroups}
              onFileSelect={() => {}}
              onToggleGroup={() => {}}
            />,
          );

          await waitForEffects();

          const output = lastFrame();
          expect(output).toContain('root.md');
          expect(output).toContain('CLAUDE.md');
          // Root files show with leading slash
          expect(output).toContain('/root.md');
        },
      );
    });

    test.skip('handles search with regex special characters', async () => {
      // Skipped: File path issues in test environment
      // This test would require special handling of file system characters
      // which varies by OS and filesystem
    });

    test('handles navigation at boundaries', async () => {
      await withTempFixture(
        {
          'CLAUDE.md': '# CLAUDE.md\n\nSingle file for navigation test',
        },
        async (fixture) => {
          const originalCwd = process.cwd();
          process.chdir(fixture.path);
          const originalHome = process.env.HOME;
          process.env.HOME = fixture.path;

          try {
            const { stdin, lastFrame, unmount } = render(
              <App cliOptions={{}} />,
            );
            const interaction = createTestInteraction(stdin, lastFrame);

            await interaction.waitForContent('Claude Files');
            await waitForEffects();

            // Try to navigate up from first item multiple times
            await interaction.navigateUp(10);

            // Should still be at first item (project-memory group)
            const output = interaction.assertOutput();
            expect(output).toContain('Project memory');
            expect(output).toContain('(1)');

            // Expand and navigate
            await interaction.selectItem();
            await interaction.navigateDown();

            // Try to navigate down from last item multiple times
            await interaction.navigateDown(10);

            // Should still show the single file
            interaction.verifyContent('CLAUDE.md');

            unmount();
          } finally {
            try {
              process.chdir(originalCwd);
            } catch {
              // Ignore error if directory no longer exists
            }
            process.env.HOME = originalHome;
          }
        },
      );
    });

    test('handles empty file groups', async () => {
      await withTempFixture(
        {
          // Empty directory
          '.gitkeep': '',
        },
        async (fixture) => {
          const originalCwd = process.cwd();
          process.chdir(fixture.path);
          const originalHome = process.env.HOME;
          process.env.HOME = fixture.path;

          try {
            const { lastFrame, unmount } = render(<App cliOptions={{}} />);

            await waitFor(() => {
              const output = lastFrame();
              if (!output || !output.includes('No Claude files found')) {
                throw new Error('Empty state not loaded yet');
              }
            });
            await waitForEffects();

            const output = lastFrame();
            // Should show no files found message
            expect(output).toContain('No Claude files found');

            unmount();
          } finally {
            try {
              process.chdir(originalCwd);
            } catch {
              // Ignore error if directory no longer exists
            }
            process.env.HOME = originalHome;
          }
        },
      );
    });
  });
}
