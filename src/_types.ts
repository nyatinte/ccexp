// Simple type alias
export type ClaudeFilePath = string;

// Backwards compatibility
export const createClaudeFilePath = (path: string): ClaudeFilePath => {
  if (path.length === 0) {
    throw new Error('Path must not be empty');
  }
  return path;
};

// Core types as defined in requirement
export type ClaudeFileType =
  | 'claude-md'
  | 'claude-local-md'
  | 'global-md'
  | 'slash-command'
  | 'unknown';

type _CommandInfo = {
  readonly name: string;
  readonly description?: string | undefined;
  readonly hasArguments: boolean;
};

export type ClaudeFileInfo = {
  readonly path: ClaudeFilePath;
  readonly type: ClaudeFileType;
  readonly size: number;
  readonly lastModified: Date;
  readonly commands: _CommandInfo[];
  readonly tags: string[];
};

export type SlashCommandInfo = {
  readonly name: string;
  readonly scope: 'project' | 'user';
  readonly namespace?: string | undefined;
  readonly description?: string | undefined;
  readonly hasArguments: boolean;
  readonly filePath: ClaudeFilePath;
  readonly lastModified: Date;
};

// Scan options
export type ScanOptions = {
  readonly path?: string | undefined;
  readonly recursive?: boolean | undefined;
  readonly type?: ClaudeFileType | undefined;
  readonly includeHidden?: boolean | undefined;
};

// File scanner interface for dependency injection
export type FileScanner = {
  readonly scanClaudeFiles: (
    options?: ScanOptions,
  ) => Promise<ClaudeFileInfo[]>;
  readonly scanSlashCommands: (
    options?: ScanOptions,
  ) => Promise<SlashCommandInfo[]>;
};

// Grouped files for UI display
export type FileGroup = {
  readonly type: ClaudeFileType;
  readonly files: ClaudeFileInfo[];
  readonly isExpanded: boolean;
};

// Output formats

// CLI argument types
export type CliOptions = {
  readonly help?: boolean | undefined;
  readonly version?: boolean | undefined;
  readonly path?: string | undefined;
};

// CLI command context types

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('createClaudeFilePath', () => {
    test('should create branded ClaudeFilePath for valid paths', () => {
      const validPaths = [
        '/test/CLAUDE.md',
        '~/CLAUDE.md',
        './src/file.md',
        'file.md',
      ];

      for (const path of validPaths) {
        const claudePath = createClaudeFilePath(path);
        expect(claudePath).toBe(path);
        expect(typeof claudePath).toBe('string');
      }
    });

    test('should throw for invalid paths', () => {
      expect(() => createClaudeFilePath('')).toThrow();
    });
  });
}
