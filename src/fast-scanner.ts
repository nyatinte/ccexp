import { fdir } from 'fdir';
import type { FileTree } from 'fs-fixture';
import type { ScanOptions } from './_types.ts';
import { DEFAULT_EXCLUSIONS } from './scan-exclusions.ts';

/**
 * Find Claude configuration files using fdir
 * Fast file scanner using fdir (fastest directory crawler for Node.js)
 * Can crawl 1 million files in < 1 second
 */
export const findClaudeFiles = async (
  options: ScanOptions = {},
): Promise<string[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  let crawler = new fdir()
    .withFullPaths()
    .exclude((dirName) => {
      // Use comprehensive exclusion patterns for security and performance
      if ((DEFAULT_EXCLUSIONS as readonly string[]).includes(dirName)) {
        return true;
      }

      // Handle hidden files (.claude is special case - always included)
      if (!includeHidden && dirName.startsWith('.') && dirName !== '.claude') {
        return true;
      }

      return false;
    })
    .filter((filePath) => {
      const fileName = filePath.split('/').pop() || '';
      return !!fileName.match(/^CLAUDE\.(md|local\.md)$/);
    });

  // Limit depth for performance
  if (!recursive) {
    crawler = crawler.withMaxDepth(1);
  } else {
    crawler = crawler.withMaxDepth(20); // Reasonable depth limit
  }

  try {
    const files = await crawler.crawl(path).withPromise();
    return files;
  } catch (error) {
    console.warn(`Failed to scan Claude files in ${path}:`, error);
    return [];
  }
};

/**
 * Find slash command files using fdir
 */
export const findSlashCommands = async (
  options: ScanOptions = {},
): Promise<string[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  let crawler = new fdir()
    .withFullPaths()
    .exclude((dirName) => {
      // Use comprehensive exclusion patterns for security and performance
      if ((DEFAULT_EXCLUSIONS as readonly string[]).includes(dirName)) {
        return true;
      }

      // Handle hidden files (.claude is special case - always included)
      if (!includeHidden && dirName.startsWith('.') && dirName !== '.claude') {
        return true;
      }

      return false;
    })
    .filter((filePath) => {
      // Look for files in .claude/commands or commands directories
      return (
        (filePath.includes('/.claude/commands/') ||
          filePath.includes('/commands/')) &&
        filePath.endsWith('.md')
      );
    });

  // Limit depth for performance
  if (!recursive) {
    crawler = crawler.withMaxDepth(3); // Commands are usually nested
  } else {
    crawler = crawler.withMaxDepth(20);
  }

  try {
    const files = await crawler.crawl(path).withPromise();
    return files;
  } catch (error) {
    console.warn(`Failed to scan slash commands in ${path}:`, error);
    return [];
  }
};

/**
 * Check if fdir is available (always true since it's a dependency)
 * Internal function for testing only
 */
const isAvailable = async (): Promise<boolean> => {
  return true;
};

/**
 * Find settings.json files using fdir
 */
export const findSettingsJson = async (
  options: ScanOptions = {},
): Promise<string[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  let crawler = new fdir()
    .withFullPaths()
    .exclude((dirName) => {
      // Use comprehensive exclusion patterns for security and performance
      if ((DEFAULT_EXCLUSIONS as readonly string[]).includes(dirName)) {
        return true;
      }

      // Handle hidden files
      if (!includeHidden && dirName.startsWith('.') && dirName !== '.claude') {
        return true;
      }

      return false;
    })
    .filter((filePath) => {
      // Look for settings.json or settings.local.json in .claude directories
      const fileName = filePath.split('/').pop() || '';
      return (
        filePath.includes('/.claude/') &&
        (fileName === 'settings.json' || fileName === 'settings.local.json')
      );
    });

  // Limit depth for performance
  if (!recursive) {
    crawler = crawler.withMaxDepth(4); // Settings are usually at specific depth
  } else {
    crawler = crawler.withMaxDepth(20);
  }

  try {
    const files = await crawler.crawl(path).withPromise();
    return files;
  } catch (error) {
    console.warn(`Failed to scan settings.json files in ${path}:`, error);
    return [];
  }
};

/**
 * Get fdir version information
 * Internal function for testing only
 */
const getVersion = async (): Promise<string> => {
  try {
    // Get version from package.json
    const pkg = await import('fdir/package.json');
    return `fdir ${pkg.version}`;
  } catch {
    return 'fdir (version unknown)';
  }
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const {
    createClaudeProjectFixture,
    createComplexProjectFixture,
    withTempFixture,
    DEFAULT_CLAUDE_MD,
  } = await import('./test-fixture-helpers.js');

  describe('fast-scanner', () => {
    test('should be available after installation', async () => {
      const available = await isAvailable();
      expect(available).toBe(true);
    });

    test('should return version information', async () => {
      const version = await getVersion();
      expect(version).toMatch(/fdir/);
    });

    test('should find CLAUDE.md files with fs-fixture', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'scanner-test',
        includeLocal: true,
      });

      const files = await findClaudeFiles({
        path: fixture.getPath('scanner-test'),
        recursive: false,
      });

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(2); // CLAUDE.md and CLAUDE.local.md
      expect(files.some((file: string) => file.endsWith('CLAUDE.md'))).toBe(
        true,
      );
      expect(
        files.some((file: string) => file.endsWith('CLAUDE.local.md')),
      ).toBe(true);
    });

    test('should respect recursive option with nested structure', async () => {
      await using _fixture = await withTempFixture(
        {
          project: {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
            nested: {
              deep: {
                'CLAUDE.md': DEFAULT_CLAUDE_MD,
              },
            },
          },
        },
        async (f) => {
          const nonRecursive = await findClaudeFiles({
            path: f.getPath('project'),
            recursive: false,
          });

          const recursive = await findClaudeFiles({
            path: f.getPath('project'),
            recursive: true,
          });

          expect(nonRecursive.length).toBe(1);
          expect(recursive.length).toBe(2);
          return f;
        },
      );
    });

    test('should find slash command files in complex structure', async () => {
      await using fixture = await createComplexProjectFixture();

      const commands = await findSlashCommands({
        path: fixture.getPath('my-app'),
        recursive: true,
      });

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      // Should find commands in both regular and nested directories
      expect(commands.some((cmd: string) => cmd.includes('test.md'))).toBe(
        true,
      );
      expect(
        commands.some((cmd: string) => cmd.includes('production/deploy.md')),
      ).toBe(true);
    });

    test('should handle non-existent paths gracefully', async () => {
      const files = await findClaudeFiles({
        path: '/non/existent/path',
        recursive: false,
      });

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    test('should find settings.json files', async () => {
      await using _fixture = await withTempFixture(
        {
          '.claude': {
            'settings.json': JSON.stringify({ version: '1.0' }),
            'settings.local.json': JSON.stringify({ local: true }),
          },
          project: {
            '.claude': {
              'settings.json': JSON.stringify({ project: true }),
            },
          },
        },
        async (f) => {
          const settings = await findSettingsJson({
            path: f.path,
            recursive: true,
          });

          expect(Array.isArray(settings)).toBe(true);
          expect(settings.length).toBe(3); // 2 settings.json + 1 settings.local.json
          expect(
            settings.some((file: string) => file.endsWith('settings.json')),
          ).toBe(true);
          expect(
            settings.some((file: string) =>
              file.endsWith('settings.local.json'),
            ),
          ).toBe(true);
          return f;
        },
      );
    });

    test('should respect exclude patterns', async () => {
      await using _fixture = await withTempFixture(
        {
          'test-project': {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
            node_modules: {
              'CLAUDE.md': 'Should be excluded',
            },
            '.git': {
              'CLAUDE.md': 'Should be excluded',
            },
          },
        },
        async (f) => {
          const files = await findClaudeFiles({
            path: f.getPath('test-project'),
            recursive: true,
          });

          expect(files.length).toBe(1);
          expect(files[0]).toContain('test-project/CLAUDE.md');
          expect(files[0]).not.toContain('node_modules');
          expect(files[0]).not.toContain('.git');
          return f;
        },
      );
    });

    test('should handle large directory structures efficiently', async () => {
      // Create a large directory structure
      const largeStructure: Record<string, FileTree> = {};
      for (let i = 0; i < 100; i++) {
        largeStructure[`dir-${i}`] = {
          'CLAUDE.md': `Content ${i}`,
          sub: {
            'CLAUDE.local.md': `Local ${i}`,
          },
        };
      }

      await using _fixture = await withTempFixture(
        largeStructure,
        async (f) => {
          const start = Date.now();
          const files = await findClaudeFiles({
            path: f.path,
            recursive: true,
          });
          const duration = Date.now() - start;

          expect(files.length).toBe(200); // 100 CLAUDE.md + 100 CLAUDE.local.md
          expect(duration).toBeLessThan(1000); // Should complete within 1 second
          return f;
        },
      );
    });

    test.skip('should handle hidden directories correctly', async () => {
      await using _fixture = await withTempFixture(
        {
          '.hidden': {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
          },
          '.claude': {
            commands: {
              'test.md': 'Test command',
            },
          },
          visible: {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
          },
        },
        async (f) => {
          // Without includeHidden
          const withoutHidden = await findClaudeFiles({
            path: f.path,
            recursive: true,
            includeHidden: false,
          });

          // With includeHidden
          const withHidden = await findClaudeFiles({
            path: f.path,
            recursive: true,
            includeHidden: true,
          });

          // .claude is always included (special case), but .hidden is not
          expect(withoutHidden.length).toBe(1); // Only visible/CLAUDE.md
          expect(withHidden.length).toBe(2); // visible/CLAUDE.md + .hidden/CLAUDE.md

          // Check slash commands - .claude should be included even without includeHidden
          const commands = await findSlashCommands({
            path: f.path,
            recursive: true,
            includeHidden: false,
          });

          expect(Array.isArray(commands)).toBe(true);
          expect(commands.length).toBe(1); // .claude/commands/test.md should be found
          return f;
        },
      );
    });
  });
}
