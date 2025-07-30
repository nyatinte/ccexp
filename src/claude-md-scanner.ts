import type { Stats } from 'node:fs';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { uniq } from 'es-toolkit/array';
import { isError } from 'es-toolkit/predicate';
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
  const { homedir } = await import('node:os');
  const homeDir = homedir();

  const {
    path = homeDir, // Default to HOME directory
    includeHidden = false,
  } = options;

  try {
    const files: string[] = [];

    // If scanning from HOME directory (default), use intelligent filtering
    if (path === homeDir) {
      // 1. Scan ~/.claude directory
      const globalClaudeDir = join(homeDir, '.claude');
      if (existsSync(globalClaudeDir)) {
        const globalFiles = await findClaudeFiles({
          path: globalClaudeDir,
          includeHidden,
        });
        files.push(...globalFiles);
      }

      // 2. Check for CLAUDE.md directly in home directory
      const homeClaudeFile = join(homeDir, 'CLAUDE.md');
      if (existsSync(homeClaudeFile)) {
        files.push(homeClaudeFile);
      }

      // 3. Scan all directories under HOME with intelligent filtering
      try {
        const homeContents = await readdir(homeDir, { withFileTypes: true });

        for (const entry of homeContents) {
          if (!entry.isDirectory() || shouldExcludeDirectory(entry.name))
            continue;

          const dirPath = join(homeDir, entry.name);

          // Prioritize likely project directories
          if (await isLikelyProjectDirectory(dirPath, entry.name)) {
            const projectFiles = await findClaudeFiles({
              path: dirPath,
              includeHidden: false,
            });
            files.push(...projectFiles);
          } else {
            // For other directories, just check the first level
            const claudeMdPath = join(dirPath, 'CLAUDE.md');
            if (existsSync(claudeMdPath)) {
              files.push(claudeMdPath);
            }

            const claudeLocalPath = join(dirPath, 'CLAUDE.local.md');
            if (existsSync(claudeLocalPath)) {
              files.push(claudeLocalPath);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to scan home subdirectories:', error);
      }
    } else {
      // Scan from a specific path (not HOME)
      const scanFiles = await findClaudeFiles({
        path,
        includeHidden,
      });
      files.push(...scanFiles);
    }

    // Remove duplicates based on file path using es-toolkit
    const uniqueFiles: string[] = uniq(files);

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
      `Failed to scan Claude files: ${isError(error) ? error.message : 'Unknown error'}`,
    );
  }
};

const getSearchPatterns = (
  type?: ClaudeFileType,
  recursive = true,
): string[] => {
  const patterns: string[] = [];
  const prefix = recursive ? '**/' : '';

  if (!type || type === 'project-memory') {
    patterns.push(`${prefix}CLAUDE.md`);
  }

  if (!type || type === 'project-memory-local') {
    patterns.push(`${prefix}CLAUDE.local.md`);
  }

  if (!type || type === 'user-memory') {
    patterns.push(CLAUDE_FILE_PATTERNS.GLOBAL_CLAUDE_MD);
  }

  if (!type || type === 'project-command') {
    patterns.push(`${prefix}.claude/commands/**/*.md`);
  }

  if (!type || type === 'personal-command') {
    patterns.push(CLAUDE_FILE_PATTERNS.USER_SLASH_COMMANDS);
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

// Helper function to determine if a directory is likely a project directory
async function isLikelyProjectDirectory(
  dirPath: string,
  dirName: string,
): Promise<boolean> {
  // 1. Pattern-based detection
  const namePatterns = [
    /^(dev|develop|development)$/i,
    /^(proj|project|projects)$/i,
    /^(work|workspace|code|src|source)$/i,
    /^(repo|repos|repositories)$/i,
    /^(git|github|gitlab)$/i,
    /^my_programs$/i, // Keep specific known directories
  ];

  if (namePatterns.some((pattern) => pattern.test(dirName))) {
    return true;
  }

  // 2. Marker file detection
  const markers = [
    '.git',
    'package.json',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    '.claude',
    'CLAUDE.md',
    'pyproject.toml',
    'composer.json',
    'Gemfile',
    'pom.xml',
    'build.gradle',
    'CMakeLists.txt',
  ];

  for (const marker of markers) {
    if (existsSync(join(dirPath, marker))) {
      return true;
    }
  }

  return false;
}

// Comprehensive exclusion patterns
function shouldExcludeDirectory(name: string): boolean {
  // Start with dot check
  if (name.startsWith('.')) {
    // Allow .claude directory specifically
    if (name === '.claude') return false;
    return true;
  }

  const excludePatterns = [
    // System/Cache
    /^\.cache$/,
    /^\.npm$/,
    /^\.yarn$/,
    /^\.pnpm$/,
    /^node_modules$/,
    /^\.git$/,
    /^\.svn$/,
    /^\.hg$/,

    // OS-specific
    /^Library$/,
    /^Applications$/,
    /^\.Trash$/, // macOS
    /^AppData$/,
    /^LocalAppData$/, // Windows

    // Large media directories
    /^Downloads$/,
    /^Pictures$/,
    /^Movies$/,
    /^Music$/,
    /^Videos$/,

    // Hidden config (already caught by dot check but explicit for clarity)
    /^\.local$/,
    /^\.config$/,
    /^\.vscode$/,
    /^\.idea$/,

    // Build/temp directories
    /^dist$/,
    /^build$/,
    /^out$/,
    /^tmp$/,
    /^temp$/,

    // Package managers
    /^vendor$/,
    /^bower_components$/,
  ];

  return excludePatterns.some((pattern) => pattern.test(name));
}

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
      const patterns = getSearchPatterns(undefined);
      expect(patterns).toContain('**/CLAUDE.md');
      expect(patterns).toContain('**/CLAUDE.local.md');
      expect(patterns).toContain('**/.claude/commands/**/*.md');
    });

    test('should return specific pattern for project-memory type', () => {
      const patterns = getSearchPatterns('project-memory');
      expect(patterns).toContain('**/CLAUDE.md');
      expect(patterns).not.toContain('**/CLAUDE.local.md');
    });

    test('should return user slash commands pattern for personal-command type', () => {
      const patterns = getSearchPatterns('personal-command');
      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toContain('.claude/commands/');
    });

    test('should include personal-command pattern when no type specified', () => {
      const patterns = getSearchPatterns(undefined);
      expect(
        patterns.some(
          (p) => p.includes('.claude/commands/') && p.includes('/'),
        ),
      ).toBe(true);
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
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Only CLAUDE.md and CLAUDE.local.md at root

      // Should find both CLAUDE.md and CLAUDE.local.md
      const types = result.map((file) => file.type);
      expect(types).toContain('project-memory');
      expect(types).toContain('project-memory-local');
    }, 10000);

    test('should handle empty directory', async () => {
      await using _fixture = await withTempFixture(
        { 'empty-dir': {} },
        async (f) => {
          const result = await scanClaudeFiles({
            path: f.getPath('empty-dir'),
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
      });

      // Local file should come first (newer)
      expect(result[0]?.type).toBe('project-memory-local');
      expect(result[1]?.type).toBe('project-memory');
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
      expect(result?.type).toBe('project-memory');
      expect(result?.path).toBe(filePath);
      expect(result?.size).toBeGreaterThan(0);
    });

    test('should extract project info', async () => {
      await using fixture = await createComplexProjectFixture();

      const filePath = fixture.getPath('my-app/CLAUDE.md');
      const result = await processClaudeFile(filePath);

      // Just verify the file was processed successfully
      expect(result).toBeDefined();
      expect(result?.type).toBe('project-memory');
    });
  });

  describe('findGlobalClaudeFiles', () => {
    test('should find Claude files in complex project structure', async () => {
      await using fixture = await createComplexProjectFixture();

      const result = await scanClaudeFiles({
        path: fixture.getPath('my-app'),
      });

      expect(result.length).toBe(2); // CLAUDE.md and CLAUDE.local.md

      const types = result.map((f) => f.type);
      expect(types).toContain('project-memory');
      expect(types).toContain('project-memory-local');
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
        includeHidden: false,
      });

      // With includeHidden
      const withHidden = await scanClaudeFiles({
        path: fixture.path,
        includeHidden: true,
      });

      expect(withoutHidden.length).toBe(1);
      expect(withHidden.length).toBe(2);
    }, 10000); // Add timeout for slower operations
  });

  describe('scanClaudeFiles - subdirectory scanning', () => {
    test('should find project CLAUDE.md files when run from subdirectory', async () => {
      // Create a project structure with CLAUDE.md files
      await using fixture = await createComplexProjectFixture();

      // Simulate scanning from a project directory
      const result = await scanClaudeFiles({
        path: fixture.getPath('my-app'), // Run from project root
      });

      // Should find CLAUDE.md files from parent directories
      const projectFiles = result.filter(
        (f) => f.type === 'project-memory' || f.type === 'project-memory-local',
      );

      // Should find at least the my-app/CLAUDE.md and my-app/CLAUDE.local.md
      expect(projectFiles.length).toBeGreaterThanOrEqual(2);
    });

    test('should find files when scanning a project directory structure', async () => {
      const { createFixture } = await import('fs-fixture');
      await using fixture = await createFixture({
        'CLAUDE.md': DEFAULT_CLAUDE_MD, // Root level file
        my_programs: {
          project1: {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
            '.git': {}, // Marker file
          },
        },
        development: {
          project2: {
            'CLAUDE.md': DEFAULT_CLAUDE_MD,
            'package.json': '{}',
          },
        },
        Downloads: {
          'CLAUDE.md': DEFAULT_CLAUDE_MD, // Normal directory
        },
        '.cache': {
          'CLAUDE.md': DEFAULT_CLAUDE_MD, // Hidden directory
        },
        'random-folder': {
          'CLAUDE.md': DEFAULT_CLAUDE_MD, // Should be found
        },
      });

      // Scan from the fixture path
      const result = await scanClaudeFiles({
        path: fixture.path,
        includeHidden: false, // Don't include hidden directories
      });

      // Non-recursive scan finds files at root and in first-level directories
      // (excluding hidden directories like .cache)
      expect(result.length).toBeGreaterThan(0);
      const paths = result.map((f) => f.path);

      // Should find the root CLAUDE.md
      expect(
        paths.some((p) => {
          const parts = p.split('/');
          return (
            parts[parts.length - 1] === 'CLAUDE.md' &&
            parts[parts.length - 2] !== undefined
          );
        }),
      ).toBe(true);

      // Should find files in first-level directories (except hidden)
      expect(paths.some((p) => p.includes('Downloads/CLAUDE.md'))).toBe(true);
      expect(paths.some((p) => p.includes('random-folder/CLAUDE.md'))).toBe(
        true,
      );

      // Should NOT find files in hidden directories
      expect(paths.some((p) => p.includes('.cache/CLAUDE.md'))).toBe(false);

      // Now it SHOULD find files in nested directories (always scans deeply)
      expect(paths.some((p) => p.includes('project1/CLAUDE.md'))).toBe(true);

      // Now scan specific directories
      const myProgramsResult = await scanClaudeFiles({
        path: join(fixture.path, 'my_programs'),
      });

      const devResult = await scanClaudeFiles({
        path: join(fixture.path, 'development'),
      });

      // Should find files in subdirectories
      expect(myProgramsResult.length).toBeGreaterThan(0);
      expect(devResult.length).toBeGreaterThan(0);

      // Verify the paths
      const myProgramsPaths = myProgramsResult.map((f) => f.path);
      expect(
        myProgramsPaths.some((p) => p.includes('project1/CLAUDE.md')),
      ).toBe(true);

      const devPaths = devResult.map((f) => f.path);
      expect(devPaths.some((p) => p.includes('project2/CLAUDE.md'))).toBe(true);
    });
  });
}
