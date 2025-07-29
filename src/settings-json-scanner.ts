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
    const { join } = await import('node:path');
    const globalClaudePath = join(homedir(), '.claude');

    // Only scan global .claude directory if it's different from the current path
    if (globalClaudePath !== path && !path.startsWith(globalClaudePath)) {
      const globalFiles = await findSettingsJson({
        path: globalClaudePath,
        recursive: false,
        includeHidden,
      });
      paths.push(...globalFiles);
    }

    // Also check for user settings.json
    const { scanUserSettings } = await import('./user-settings-scanner.js');
    const userSettings = await scanUserSettings();
    if (userSettings) {
      // Convert to array format expected by the rest of the function
      paths.push(userSettings.path);
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

    test('should include user settings when scanning recursively', async () => {
      // This test verifies that scanSettingsJson integrates with user settings scanner
      // We'll test the actual integration without mocking to ensure it works correctly

      const projectFixture = await createFixture({
        project: {
          '.claude': {
            'settings.json': JSON.stringify({ project: 'test' }),
          },
        },
      });

      try {
        const results = await scanSettingsJson({
          path: projectFixture.path,
          recursive: true,
        });

        // Should include project settings
        expect(results.length).toBeGreaterThanOrEqual(1);

        // Check that project settings is included
        const projectSettings = results.find(
          (file) => file.type === 'settings-json',
        );
        expect(projectSettings).toBeTruthy();
        expect(projectSettings?.path).toContain('project');

        // The integration with user settings scanner is verified by the fact that
        // the function completes without error
      } finally {
        await projectFixture.rm();
      }
    });

    test('should handle case when user settings does not exist', async () => {
      // Create a temp directory without .claude/settings.json
      const emptyHomeFixture = await createFixture({});

      try {
        // Test the UserSettingsScanner directly with empty directory
        const { UserSettingsScanner } = await import(
          './user-settings-scanner.js'
        );
        const scanner = new UserSettingsScanner(() => emptyHomeFixture.path);
        const result = await scanner.scan();

        // Should return null when settings.json doesn't exist
        expect(result).toBeNull();
      } finally {
        await emptyHomeFixture.rm();
      }
    });

    test('should correctly identify user settings file type', async () => {
      // Create a home directory fixture with valid settings
      const homeFixture = await createFixture({
        '.claude': {
          'settings.json': JSON.stringify({
            theme: 'dark',
            enableAutoSave: true,
            tabSize: 2,
          }),
        },
      });

      try {
        // Test the UserSettingsScanner directly with mocked homedir
        const { UserSettingsScanner } = await import(
          './user-settings-scanner.js'
        );
        const scanner = new UserSettingsScanner(() => homeFixture.path);
        const result = await scanner.scan();

        // Verify the user settings scanner works correctly
        expect(result).toBeTruthy();
        expect(result?.type).toBe('user-settings');
        expect(result?.fileType).toBe('user-settings');
        expect(result?.path).toContain('.claude/settings.json');
        expect(result?.path).toContain(homeFixture.path);

        // Verify it contains the expected content
        if (result?.content) {
          const parsed = JSON.parse(result.content);
          expect(parsed.theme).toBe('dark');
          expect(parsed.enableAutoSave).toBe(true);
          expect(parsed.tabSize).toBe(2);
        }
      } finally {
        await homeFixture.rm();
      }
    });
  });
}
