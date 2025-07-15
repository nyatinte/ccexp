import type { Stats } from 'node:fs';
import type { ClaudeFileInfo, ScanOptions } from './_types.ts';
import { createClaudeFilePath } from './_types.ts';
import { detectClaudeFileType } from './_utils.ts';
import { BaseFileScanner } from './base-file-scanner.ts';
import { findSettingsJson } from './fast-scanner.ts';

/**
 * Settings JSON scanner for parsing .claude/project/settings.json files
 */
class SettingsJsonScanner extends BaseFileScanner<ClaudeFileInfo> {
  protected readonly maxFileSize = 1024 * 1024; // 1MB limit for settings files
  protected readonly fileType = 'settings.json';

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<ClaudeFileInfo | null> {
    try {
      // Try to parse JSON to validate it
      JSON.parse(content);

      // Extract any tags from content (unlikely for JSON but keeping consistency)
      const tags: string[] = [];

      return {
        path: createClaudeFilePath(filePath),
        type: detectClaudeFileType(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        commands: [],
        tags,
      };
    } catch (error) {
      console.warn(`Invalid JSON in settings file ${filePath}:`, error);
      return null;
    }
  }
}

/**
 * Scan for settings.json files in .claude/project directories
 */
export const scanSettingsJson = async (
  options: ScanOptions = {},
): Promise<ClaudeFileInfo[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  // Scan specified path
  const paths = await findSettingsJson({
    path,
    recursive,
    includeHidden,
  });

  // Also scan global Claude directory if scanning recursively
  if (recursive) {
    const { homedir } = await import('node:os');
    const globalPath = homedir();

    // Only scan home directory if it's different from the current path
    if (globalPath !== path) {
      const globalFiles = await findSettingsJson({
        path: globalPath,
        recursive: false,
        includeHidden,
      });
      paths.push(...globalFiles);
    }
  }

  // Remove duplicates based on file path
  const uniquePaths: string[] = Array.from(new Set(paths));

  const scanner = new SettingsJsonScanner();

  const results = await Promise.all(
    uniquePaths.map((path) => scanner.processFile(path)),
  );

  return results.filter((file): file is ClaudeFileInfo => file !== null);
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const { createFixture } = await import('fs-fixture');

  describe('SettingsJsonScanner', () => {
    test('should parse valid settings.json files', async () => {
      const scanner = new SettingsJsonScanner();

      const fixture = await createFixture({
        '.claude': {
          'settings.json': JSON.stringify({
            version: '1.0',
            features: ['feature1', 'feature2'],
          }),
        },
      });

      try {
        const result = await scanner.processFile(
          `${fixture.path}/.claude/settings.json`,
        );

        expect(result).toBeTruthy();
        expect(result?.type).toBe('settings-json');
        expect(result?.path).toContain('settings.json');
      } finally {
        await fixture.rm();
      }
    });

    test('should handle invalid JSON gracefully', async () => {
      const scanner = new SettingsJsonScanner();

      const fixture = await createFixture({
        '.claude': {
          'settings.json': '{ invalid json',
        },
      });

      try {
        const result = await scanner.processFile(
          `${fixture.path}/.claude/settings.json`,
        );

        expect(result).toBeNull();
      } finally {
        await fixture.rm();
      }
    });

    test('should handle large files', async () => {
      const scanner = new SettingsJsonScanner();

      // Create content larger than 1MB
      const largeContent = JSON.stringify({
        data: 'x'.repeat(1024 * 1024 + 1),
      });

      const fixture = await createFixture({
        '.claude': {
          'settings.json': largeContent,
        },
      });

      try {
        const result = await scanner.processFile(
          `${fixture.path}/.claude/settings.json`,
        );

        // Should be null due to size limit
        expect(result).toBeNull();
      } finally {
        await fixture.rm();
      }
    });
  });

  describe('scanSettingsJson', () => {
    test('should scan multiple settings.json files', async () => {
      const fixture = await createFixture({
        project1: {
          '.claude': {
            'settings.json': JSON.stringify({ project: 'project1' }),
            'settings.local.json': JSON.stringify({ local: true }),
          },
        },
        project2: {
          '.claude': {
            'settings.json': JSON.stringify({ project: 'project2' }),
          },
        },
      });

      try {
        const results = await scanSettingsJson({
          path: fixture.path,
          recursive: false, // Don't scan home directory in tests
        });

        expect(results).toHaveLength(3); // 2 settings.json + 1 settings.local.json
        expect(
          results.filter((file) => file.type === 'settings-json'),
        ).toHaveLength(2);
        expect(
          results.filter((file) => file.type === 'settings-local-json'),
        ).toHaveLength(1);
      } finally {
        await fixture.rm();
      }
    }, 10000); // Increase timeout
  });
}
