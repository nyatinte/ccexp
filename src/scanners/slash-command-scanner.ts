import type { Stats } from 'node:fs';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { truncate } from 'es-toolkit/compat';
import { isError } from 'es-toolkit/predicate';
import { FILE_SIZE_LIMITS } from '../lib/constants.js';
import type { ScanOptions, SlashCommandInfo } from '../lib/types.js';
import { createClaudeFilePath } from '../lib/types.js';
import { getFileScope, parseSlashCommandName } from '../lib/utils.js';
import { BaseFileScanner } from './base-file-scanner.js';
import { findSlashCommands } from './fast-scanner.js';

export const scanSlashCommands = async (
  options: ScanOptions = {},
): Promise<SlashCommandInfo[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  const _patterns = getSlashCommandPatterns(recursive);
  const searchPaths = [path, join(homedir(), '.claude', 'commands')];

  try {
    const allCommands: SlashCommandInfo[] = [];

    for (const searchPath of searchPaths) {
      if (!existsSync(searchPath)) {
        continue;
      }

      // Use fast scanner for better performance and security
      const files = await findSlashCommands({
        path: searchPath,
        recursive,
        includeHidden,
      });

      for (const filePath of files) {
        try {
          const commandInfo = await processSlashCommandFile(filePath);
          if (commandInfo) {
            allCommands.push(commandInfo);
          }
        } catch (error) {
          console.warn(
            `Failed to process slash command file: ${filePath}`,
            error,
          );
        }
      }
    }

    // Sort by name
    return allCommands.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(
      `Failed to scan slash commands: ${isError(error) ? error.message : 'Unknown error'}`,
    );
  }
};

const getSlashCommandPatterns = (recursive = true): string[] => {
  const prefix = recursive ? '**/' : '';
  return [
    `${prefix}.claude/commands/**/*.md`,
    `${prefix}commands/**/*.md`, // Alternative location
  ];
};

class SlashCommandScanner extends BaseFileScanner<SlashCommandInfo> {
  protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_SLASH_COMMAND_SIZE;
  protected readonly fileType = 'Slash command';

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<SlashCommandInfo | null> {
    // Basic validation - slash command files should contain some content
    if (content.trim().length === 0) {
      return null;
    }

    // Extract command name from file path
    const relativePath = getRelativeCommandPath(filePath);
    const commandName = parseSlashCommandName(relativePath);

    // Extract namespace if present (from directory structure)
    const namespace = extractNamespace(relativePath);

    // Determine scope (project or user)
    const scope = getFileScope(filePath);

    // Extract description from content (first line or H1)
    const description = extractDescription(content);

    // Check if command has arguments (look for parameter syntax)
    const hasArguments = hasCommandArguments(content);

    return {
      name: commandName,
      scope,
      namespace,
      description,
      hasArguments,
      filePath: createClaudeFilePath(filePath),
      lastModified: stats.mtime,
    };
  }
}

const scanner = new SlashCommandScanner();
const processSlashCommandFile = (filePath: string) =>
  scanner.processFile(filePath);

const getRelativeCommandPath = (filePath: string): string => {
  // Extract path relative to .claude/commands or commands directory
  const commandsIndex = filePath.lastIndexOf('commands/');
  if (commandsIndex !== -1) {
    return filePath.slice(commandsIndex + 'commands/'.length);
  }

  return basename(filePath);
};

const extractNamespace = (relativePath: string): string | undefined => {
  const dirs = dirname(relativePath).split('/');
  return dirs[0] !== '.' ? dirs[0] : undefined;
};

const extractDescription = (content: string): string | undefined => {
  const lines = content.split('\n');

  // Look for H1 heading
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim();
    }
  }

  // Fall back to first non-empty line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      return truncate(trimmed, { length: 100 });
    }
  }

  return undefined;
};

const hasCommandArguments = (content: string): boolean => {
  // Look for common argument patterns
  const argumentPatterns = [
    /<[^>]+>/, // Angle brackets: <argument>
    /\[[^\]]+\]/, // Square brackets: [argument]
    /\$\{[^}]+\}/, // Variable syntax: ${variable}
    /--\w+/, // Long options: --option
    /-\w/, // Short options: -o
    /\{\{[^}]+\}\}/, // Template syntax: {{variable}}
  ];

  return argumentPatterns.some((pattern) => pattern.test(content));
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('getSlashCommandPatterns', () => {
    test('should return command patterns with recursion', () => {
      const patterns = getSlashCommandPatterns(true);
      expect(patterns).toContain('**/.claude/commands/**/*.md');
      expect(patterns).toContain('**/commands/**/*.md');
    });

    test('should return patterns without recursion', () => {
      const patterns = getSlashCommandPatterns(false);
      expect(patterns).toContain('.claude/commands/**/*.md');
      expect(patterns).toContain('commands/**/*.md');
    });
  });

  describe('getRelativeCommandPath', () => {
    test('should extract path relative to commands directory', () => {
      const path = '/project/.claude/commands/git/commit.md';
      expect(getRelativeCommandPath(path)).toBe('git/commit.md');
    });

    test('should handle direct command files', () => {
      const path = '/project/.claude/commands/deploy.md';
      expect(getRelativeCommandPath(path)).toBe('deploy.md');
    });
  });

  describe('extractNamespace', () => {
    test('should extract namespace from nested path', () => {
      expect(extractNamespace('git/commit.md')).toBe('git');
      expect(extractNamespace('frontend/component.md')).toBe('frontend');
    });

    test('should return undefined for root level commands', () => {
      expect(extractNamespace('deploy.md')).toBeUndefined();
      expect(extractNamespace('./deploy.md')).toBeUndefined();
    });
  });

  describe('extractDescription', () => {
    test('should extract H1 heading as description', () => {
      const content = '# Deploy to production\n\nThis command deploys...';
      expect(extractDescription(content)).toBe('Deploy to production');
    });

    test('should fall back to first non-empty line', () => {
      const content = '\n\nDeploy command for production\n\nUsage: ...';
      expect(extractDescription(content)).toBe('Deploy command for production');
    });

    test('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(150);
      const content = `${longDescription}\n\nMore content...`;
      const result = extractDescription(content);
      expect(result?.endsWith('...')).toBe(true);
      expect(result?.length).toBe(100); // 97 chars + "..."
    });
  });

  describe('hasCommandArguments', () => {
    test('should detect angle bracket arguments', () => {
      expect(hasCommandArguments('Deploy to <environment>')).toBe(true);
      expect(hasCommandArguments('Usage: command <arg1> <arg2>')).toBe(true);
    });

    test('should detect square bracket arguments', () => {
      expect(hasCommandArguments('Deploy [--force]')).toBe(true);
      expect(hasCommandArguments('Optional [argument]')).toBe(true);
    });

    test('should detect option flags', () => {
      expect(hasCommandArguments('command --force --dry-run')).toBe(true);
      expect(hasCommandArguments('command -f -d')).toBe(true);
    });

    test('should detect variable syntax', () => {
      expect(hasCommandArguments('Deploy to ' + '$' + '{ENVIRONMENT}')).toBe(
        true,
      );
      expect(hasCommandArguments('Template: {{variable}}')).toBe(true);
    });

    test('should return false for plain text', () => {
      expect(hasCommandArguments('Simple command description')).toBe(false);
      expect(hasCommandArguments('Just some text')).toBe(false);
    });
  });
}
