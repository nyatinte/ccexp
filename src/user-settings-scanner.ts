import type { Stats } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { FILE_SIZE_LIMITS } from './_consts.js';
import type { ClaudeFileInfo, ClaudeFileType } from './_types.js';
import { settingsSchema } from './_types.js';
import { BaseFileScanner } from './base-file-scanner.js';

class UserSettingsScanner extends BaseFileScanner<ClaudeFileInfo> {
  protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_SETTINGS_SIZE;
  protected readonly fileType = 'User settings';
  protected readonly logger = {
    debug: (message: string) => {
      if (process.env.DEBUG) {
        console.debug(message);
      }
    },
  };
  private readonly homedirFn: () => string;

  constructor(homedirFn?: () => string) {
    super();
    this.homedirFn = homedirFn ?? homedir;
  }

  /**
   * Get the path to the user settings file
   */
  getUserSettingsPath(): string {
    return join(this.homedirFn(), '.claude', 'settings.json');
  }

  /**
   * Scan for user settings file
   */
  async scan(): Promise<ClaudeFileInfo | null> {
    const settingsPath = this.getUserSettingsPath();
    return this.processFile(settingsPath);
  }

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<ClaudeFileInfo | null> {
    try {
      const settings = JSON.parse(content);
      const validated = settingsSchema.parse(settings);

      return {
        path: filePath,
        fileName: 'settings.json',
        dirPath: join(this.homedirFn(), '.claude'),
        type: 'user-settings' as ClaudeFileType,
        fileType: 'user-settings' as ClaudeFileType,
        size: stats.size,
        lastModified: stats.mtime,
        content: JSON.stringify(validated, null, 2),
        commands: [],
        tags: [],
      };
    } catch (error) {
      // JSON parse error or validation error
      this.logger.debug(
        `Failed to parse user settings at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}

/**
 * Convenience function to scan user settings
 */
export const scanUserSettings = async (
  homedirFn?: () => string,
): Promise<ClaudeFileInfo | null> => {
  const scanner = new UserSettingsScanner(homedirFn);
  return scanner.scan();
};

/**
 * Export the scanner class for testing
 */
export { UserSettingsScanner };

// InSource Tests
if (import.meta.vitest != null) {
  const { describe, test, expect, vi, afterEach } = import.meta.vitest;
  const { createFixture } = await import('fs-fixture');

  describe('UserSettingsScanner', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should scan user settings file successfully', async () => {
      await using fixture = await createFixture({
        '.claude': {
          'settings.json': JSON.stringify(
            {
              theme: 'dark',
              enableAutoSave: true,
              tabSize: 2,
            },
            null,
            2,
          ),
        },
      });

      const scanner = new UserSettingsScanner(() => fixture.path);
      const result = await scanner.scan();

      expect(result).not.toBeNull();
      expect(result?.type).toBe('user-settings');
      expect(result?.fileName).toBe('settings.json');
      expect(result?.dirPath).toBe(join(fixture.path, '.claude'));
      expect(result?.path).toBe(join(fixture.path, '.claude', 'settings.json'));

      // Verify content is valid JSON
      if (result?.content) {
        const parsed = JSON.parse(result.content);
        expect(parsed.theme).toBe('dark');
        expect(parsed.enableAutoSave).toBe(true);
        expect(parsed.tabSize).toBe(2);
      }
    });

    test('should return null when settings file does not exist', async () => {
      await using fixture = await createFixture({});

      const scanner = new UserSettingsScanner(() => fixture.path);
      const result = await scanner.scan();

      expect(result).toBeNull();
    });

    test('should return null for invalid JSON', async () => {
      await using fixture = await createFixture({
        '.claude': {
          'settings.json': 'invalid json content',
        },
      });

      const scanner = new UserSettingsScanner(() => fixture.path);
      const result = await scanner.scan();

      expect(result).toBeNull();
    });

    test('should return null for settings that fail validation', async () => {
      await using fixture = await createFixture({
        '.claude': {
          'settings.json': JSON.stringify({
            theme: 'invalid-theme', // Should fail validation
            tabSize: 'not-a-number', // Should fail validation
          }),
        },
      });

      const scanner = new UserSettingsScanner(() => fixture.path);
      const result = await scanner.scan();

      expect(result).toBeNull();
    });

    test('getUserSettingsPath should return correct path', () => {
      const mockHomedir = '/test/home';
      const scanner = new UserSettingsScanner(() => mockHomedir);
      const path = scanner.getUserSettingsPath();
      expect(path).toBe(join(mockHomedir, '.claude', 'settings.json'));
    });

    test('scanUserSettings convenience function should work', async () => {
      // Test the function exists and returns expected type
      const result = await scanUserSettings();

      // The result depends on whether the user has ~/.claude/settings.json
      // We can only test that it returns null or a valid settings object
      if (result !== null) {
        expect(result.type).toBe('user-settings');
        expect(result.fileName).toBe('settings.json');
        expect(result.path).toContain('settings.json');
        expect(result.commands).toEqual([]);
        expect(result.tags).toEqual([]);
      }
      // Both null and valid object are acceptable results
      expect(result === null || result?.type === 'user-settings').toBe(true);
    });
  });
}
