import { homedir } from 'node:os';
import { join } from 'node:path';

// Claude file patterns
export const CLAUDE_FILE_PATTERNS = {
  CLAUDE_MD: '**/CLAUDE.md',
  CLAUDE_LOCAL_MD: '**/CLAUDE.local.md',
  GLOBAL_CLAUDE_MD: join(homedir(), '.claude', 'CLAUDE.md'),
  PROJECT_SLASH_COMMANDS: '**/.claude/commands/**/*.md',
  USER_SLASH_COMMANDS: join(homedir(), '.claude', 'commands', '**', '*.md'),
} as const;

// Removed unused DEFAULT_SEARCH_PATHS

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  MAX_CLAUDE_MD_SIZE: 1024 * 1024, // 1MB
  MAX_SLASH_COMMAND_SIZE: 512 * 1024, // 512KB
} as const;

// CLI output configuration
const _OUTPUT_CONFIG = {
  DEFAULT_TABLE_WIDTH: 120,
  MAX_DESCRIPTION_LENGTH: 80,
  MAX_PATH_LENGTH: 60,
} as const;

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('CLAUDE_FILE_PATTERNS', () => {
    test('should contain expected patterns', () => {
      expect(CLAUDE_FILE_PATTERNS.CLAUDE_MD).toBe('**/CLAUDE.md');
      expect(CLAUDE_FILE_PATTERNS.CLAUDE_LOCAL_MD).toBe('**/CLAUDE.local.md');
      expect(CLAUDE_FILE_PATTERNS.PROJECT_SLASH_COMMANDS).toBe(
        '**/.claude/commands/**/*.md',
      );
    });

    test('should include home directory paths', () => {
      expect(CLAUDE_FILE_PATTERNS.GLOBAL_CLAUDE_MD).toContain('.claude');
      expect(CLAUDE_FILE_PATTERNS.USER_SLASH_COMMANDS).toContain(
        '.claude/commands',
      );
    });
  });

  // Removed DEFAULT_SEARCH_PATHS tests (no longer exported)

  describe('FILE_SIZE_LIMITS', () => {
    test('should have reasonable size limits', () => {
      expect(FILE_SIZE_LIMITS.MAX_CLAUDE_MD_SIZE).toBe(1024 * 1024);
      expect(FILE_SIZE_LIMITS.MAX_SLASH_COMMAND_SIZE).toBe(512 * 1024);
    });
  });
}
