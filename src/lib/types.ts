// Simple type alias
export type ClaudeFilePath = string;

// Backwards compatibility
export const createClaudeFilePath = (path: string): ClaudeFilePath => {
  if (path.length === 0) {
    throw new Error('Path must not be empty');
  }
  return path;
};

export type ClaudeFileType =
  | 'user-memory'
  | 'project-memory'
  | 'project-memory-local'
  | 'project-command'
  | 'personal-command'
  | 'project-subagent'
  | 'user-subagent'
  | 'project-settings'
  | 'project-settings-local'
  | 'user-settings'
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

export type SubAgentInfo = {
  readonly name: string;
  readonly scope: 'project' | 'user';
  readonly description?: string | undefined;
  readonly tools?: string[] | undefined;
  readonly filePath: ClaudeFilePath;
  readonly lastModified: Date;
};

// Scan options
export type ScanOptions = {
  readonly path?: string | undefined; // default: HOME directory
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
  readonly scanSubAgents: (options?: ScanOptions) => Promise<SubAgentInfo[]>;
  readonly scanSettingsJson: (
    options?: ScanOptions,
  ) => Promise<ClaudeFileInfo[]>;
};

// Grouped files for UI display
export type FileGroup = {
  readonly type: ClaudeFileType;
  readonly files: ClaudeFileInfo[];
  readonly isExpanded: boolean;
};

export type FlatItem =
  | { readonly type: 'group'; readonly groupIndex: number }
  | {
      readonly type: 'file';
      readonly groupIndex: number;
      readonly fileIndex: number;
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
