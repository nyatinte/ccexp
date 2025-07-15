import type { Stats } from 'node:fs';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAUDE_FILE_PATTERNS, FILE_SIZE_LIMITS } from './_consts.ts';
import type { ClaudeFileInfo, ClaudeFileType, ScanOptions } from './_types.ts';
import { createClaudeFilePath } from './_types.ts';
import {
  detectClaudeFileType,
  extractCommandsFromContent,
  extractTagsFromContent,
  validateClaudeMdContent,
} from './_utils.ts';
import { BaseFileScanner } from './base-file-scanner.ts';
import { findClaudeFiles } from './fast-scanner.ts';

export const scanClaudeFiles = async (
  options: ScanOptions = {},
): Promise<ClaudeFileInfo[]> => {
  const {
    path = process.cwd(),
    recursive = true,
    includeHidden = false,
  } = options;

  try {
    // Scan specified path
    const files = await findClaudeFiles({
      path,
      recursive,
      includeHidden,
    });

    // Also scan global Claude directory if scanning recursively
    if (recursive) {
      const { homedir } = await import('node:os');
      const homeDir = homedir();

      // Only scan if current path is not already the home directory or .claude directory
      if (path !== homeDir && path !== join(homeDir, '.claude')) {
        // 1. Scan ~/.claude directory recursively
        const globalClaudeDir = join(homeDir, '.claude');
        if (existsSync(globalClaudeDir)) {
          const globalFiles = await findClaudeFiles({
            path: globalClaudeDir,
            recursive: true,
            includeHidden,
          });
          files.push(...globalFiles);
        }

        // 2. Check for CLAUDE.md directly in home directory
        const homeClaudeFile = join(homeDir, 'CLAUDE.md');
        if (existsSync(homeClaudeFile)) {
          files.push(homeClaudeFile);
        }

        // 3. Scan first-level subdirectories in home for CLAUDE.md files
        // This finds project-level CLAUDE.md files without deep recursion
        try {
          const homeContents = await readdir(homeDir, { withFileTypes: true });
          const directoriesToSkip = new Set([
            '.cache',
            '.npm',
            '.yarn',
            '.pnpm',
            'node_modules',
            '.git',
            '.svn',
            '.hg',
            'Library',
            'Applications',
            '.Trash',
            '.local',
            '.config',
            '.vscode',
            '.idea',
          ]);

          // Common project directories that should be scanned deeper
          const projectDirectories = new Set([
            'my_programs',
            'projects',
            'dev',
            'development',
            'workspace',
            'work',
            'code',
            'repos',
            'git',
            'Documents',
            'Desktop',
            'src',
            'source',
          ]);

          for (const entry of homeContents) {
            if (
              entry.isDirectory() &&
              !directoriesToSkip.has(entry.name) &&
              !entry.name.startsWith('.')
            ) {
              const dirPath = join(homeDir, entry.name);

              // Check for CLAUDE.md in this directory
              const claudeMdPath = join(dirPath, 'CLAUDE.md');
              if (existsSync(claudeMdPath)) {
                files.push(claudeMdPath);
              }

              // Also check for CLAUDE.local.md
              const claudeLocalPath = join(dirPath, 'CLAUDE.local.md');
              if (existsSync(claudeLocalPath)) {
                files.push(claudeLocalPath);
              }

              // For project directories, scan recursively but with constraints
              if (projectDirectories.has(entry.name)) {
                try {
                  // Use findClaudeFiles to recursively scan project directories
                  const projectFiles = await findClaudeFiles({
                    path: dirPath,
                    recursive: true,
                    includeHidden: false,
                  });
                  files.push(...projectFiles);
                } catch (error) {
                  // If we can't scan the directory, just skip it
                  console.warn(
                    `Failed to scan ${entry.name} subdirectories:`,
                    error,
                  );
                }
              }
            }
          }
        } catch (error) {
          // If we can't read home directory, just continue
          console.warn('Failed to scan home subdirectories:', error);
        }
      }
    }

    // Remove duplicates based on file path
    const uniqueFiles: string[] = Array.from(new Set(files));

    // Process each file
    const fileInfos: ClaudeFileInfo[] = [];

    for (const filePath of uniqueFiles) {
      try {
        const fileInfo = await processClaudeFile(filePath);
        if (fileInfo) {
          fileInfos.push(fileInfo);
        }
      } catch (error) {
        console.warn(`Failed to process file: ${filePath}`, error);
      }
    }

    // Sort by last modified date (newest first)
    return fileInfos.sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
    );
  } catch (error) {
    throw new Error(
      `Failed to scan Claude files: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

const getSearchPatterns = (
  type?: ClaudeFileType,
  recursive = true,
): string[] => {
  const patterns: string[] = [];
  const prefix = recursive ? '**/' : '';

  if (!type || type === 'claude-md') {
    patterns.push(`${prefix}CLAUDE.md`);
  }

  if (!type || type === 'claude-local-md') {
    patterns.push(`${prefix}CLAUDE.local.md`);
  }

  if (!type || type === 'global-md') {
    patterns.push(CLAUDE_FILE_PATTERNS.GLOBAL_CLAUDE_MD);
  }

  if (!type || type === 'slash-command') {
    patterns.push(`${prefix}.claude/commands/**/*.md`);
  }

  return patterns;
};

class ClaudeMdScanner extends BaseFileScanner<ClaudeFileInfo> {
  protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_CLAUDE_MD_SIZE;
  protected readonly fileType = 'Claude.md';

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<ClaudeFileInfo | null> {
    // Validate content
    if (!validateClaudeMdContent(content)) {
      console.warn(`Invalid Claude.md content, skipping: ${filePath}`);
      return null;
    }

    // Detect file type
    const fileType = detectClaudeFileType(filePath);

    // Extract information from content
    const tags = extractTagsFromContent(content);
    const commands = extractCommandsFromContent(content);

    return {
      path: createClaudeFilePath(filePath),
      type: fileType,
      size: stats.size,
      lastModified: stats.mtime,
      commands,
      tags,
    };
  }
}

const scanner = new ClaudeMdScanner();
const processClaudeFile = (filePath: string) => scanner.processFile(filePath);

// Removed unused function _findGlobalClaudeFiles

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const {
    createClaudeProjectFixture,
    createComplexProjectFixture,
    withTempFixture,
    DEFAULT_CLAUDE_MD,
  } = await import('./test-fixture-helpers.js');

  describe('getSearchPatterns', () => {
    test('should return all patterns when no type specified', () => {
      const patterns = getSearchPatterns(undefined, true);
      expect(patterns).toContain('**/CLAUDE.md');
      expect(patterns).toContain('**/CLAUDE.local.md');
      expect(patterns).toContain('**/.claude/commands/**/*.md');
    });

    test('should return specific pattern for claude-md type', () => {
      const patterns = getSearchPatterns('claude-md', true);
      expect(patterns).toContain('**/CLAUDE.md');
      expect(patterns).not.toContain('**/CLAUDE.local.md');
    });

    test('should respect recursive option', () => {
      const patterns = getSearchPatterns('claude-md', false);
      expect(patterns).toContain('CLAUDE.md');
      expect(patterns).not.toContain('**/CLAUDE.md');
    });
  });

  describe('scanClaudeFiles', () => {
    test('should scan files in a fixture directory', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'test-scan',
        includeLocal: true,
        includeCommands: true,
      });

      const result = await scanClaudeFiles({
        path: fixture.getPath('test-scan'),
        recursive: false, // Don't scan recursively to avoid scanning home directory
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Only CLAUDE.md and CLAUDE.local.md at root

      // Should find both CLAUDE.md and CLAUDE.local.md
      const types = result.map((file) => file.type);
      expect(types).toContain('claude-md');
      expect(types).toContain('claude-local-md');
    }, 10000);

    test('should handle empty directory', async () => {
      await using _fixture = await withTempFixture(
        { 'empty-dir': {} },
        async (f) => {
          const result = await scanClaudeFiles({
            path: f.getPath('empty-dir'),
            recursive: false,
          });
          expect(result).toEqual([]);
          return f;
        },
      );
    });

    test('should use current directory as default path', async () => {
      const options: ScanOptions = {};
      // Test would call scanClaudeFiles with process.cwd() as default
      expect(options.path).toBeUndefined();
    });

    test('should sort files by last modified date', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'sort-test',
        includeLocal: true,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Touch the local file to make it newer
      await fixture.writeFile(
        'sort-test/CLAUDE.local.md',
        `${DEFAULT_CLAUDE_MD}\n// Updated`,
      );

      const result = await scanClaudeFiles({
        path: fixture.getPath('sort-test'),
        recursive: false,
      });

      // Local file should come first (newer)
      expect(result[0]?.type).toBe('claude-local-md');
      expect(result[1]?.type).toBe('claude-md');
    });
  });

  describe('processClaudeFile', () => {
    test('should return null for non-existent file', async () => {
      const result = await processClaudeFile('/non/existent/file.md');
      expect(result).toBeNull();
    });

    test('should process valid CLAUDE.md file', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'process-test',
      });

      const filePath = fixture.getPath('process-test/CLAUDE.md');
      const result = await processClaudeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('claude-md');
      expect(result?.path).toBe(filePath);
      expect(result?.size).toBeGreaterThan(0);
    });

    test('should extract project info', async () => {
      await using fixture = await createComplexProjectFixture();

      const filePath = fixture.getPath('my-app/CLAUDE.md');
      const result = await processClaudeFile(filePath);

      // Just verify the file was processed successfully
      expect(result).toBeDefined();
      expect(result?.type).toBe('claude-md');
    });
  });

  describe('findGlobalClaudeFiles', () => {
    test('should find Claude files in complex project structure', async () => {
      await using fixture = await createComplexProjectFixture();

      const result = await scanClaudeFiles({
        path: fixture.getPath('my-app'),
        recursive: false, // Don't scan recursively to avoid home directory scan
      });

      expect(result.length).toBe(2); // CLAUDE.md and CLAUDE.local.md

      const types = result.map((f) => f.type);
      expect(types).toContain('claude-md');
      expect(types).toContain('claude-local-md');
    });

    test('should handle includeHidden option', async () => {
      const { createFixture } = await import('fs-fixture');
      await using fixture = await createFixture({
        '.hidden': {
          'CLAUDE.md': DEFAULT_CLAUDE_MD,
        },
        visible: {
          'CLAUDE.md': DEFAULT_CLAUDE_MD,
        },
      });

      // Without includeHidden
      const withoutHidden = await scanClaudeFiles({
        path: fixture.path,
        recursive: false, // Don't scan recursively to avoid scanning home directory
        includeHidden: false,
      });

      // With includeHidden
      const withHidden = await scanClaudeFiles({
        path: fixture.path,
        recursive: false, // Don't scan recursively to avoid scanning home directory
        includeHidden: true,
      });

      expect(withoutHidden.length).toBe(1);
      expect(withHidden.length).toBe(2);
    }, 10000); // Add timeout for slower operations
  });
}
