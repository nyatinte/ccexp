import { createHash } from 'node:crypto';
import type { FileTree } from 'fs-fixture';
import { createFixture, type FsFixture } from 'fs-fixture';
import { match } from 'ts-pattern';

/**
 * Cache for reusable fixtures to avoid recreation.
 * Should be cleared after test suites complete using clearFixtureCache().
 * Note: Cached fixtures are shared - only use for read-only tests.
 */
const fixturePool = new Map<string, FsFixture>();

/**
 * Generate a hash from fixture structure for caching
 */
function hashFileTree(fileTree: FileTree): string {
  const hash = createHash('sha256');
  // Sort keys recursively for consistent serialization
  const sortedStringify = (obj: unknown): string => {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map(sortedStringify).join(',')}]`;
    }
    const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = sortedKeys.map(
      (key) =>
        `${JSON.stringify(key)}:${sortedStringify((obj as Record<string, unknown>)[key])}`,
    );
    return `{${pairs.join(',')}}`;
  };
  hash.update(sortedStringify(fileTree));
  return hash.digest('hex').substring(0, 16);
}

/**
 * Generate mock file content for testing
 */
export const createMockFileContent = (
  type: 'claude-md' | 'slash-command' | 'markdown',
) => {
  return match(type)
    .with(
      'claude-md',
      () => `# CLAUDE.md

## Project Configuration

This is a test Claude configuration file.

### Development Rules
- Use TypeScript strict mode
- Follow React Ink patterns
`,
    )
    .with(
      'slash-command',
      () => `# Deploy Command

Deploys the application to production.

## Usage
\`/deploy [environment]\`

## Arguments
- environment: Target environment (staging, production)
`,
    )
    .with(
      'markdown',
      () => `# Test Document

This is a **test** markdown document with *formatting*.

## Features
- Lists
- Code blocks
- **Bold text**
- *Italic text*

\`\`\`typescript
const example = "Hello World";
\`\`\`
`,
    )
    .exhaustive();
};

/**
 * Default CLAUDE.md content for testing
 */
export const DEFAULT_CLAUDE_MD = `# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Test project for validating fs-fixture integration.

## Commands

- \`bun run test\` - Run tests
- \`bun run build\` - Build project
`;

/**
 * Default CLAUDE.local.md content for testing
 */
const DEFAULT_CLAUDE_LOCAL_MD = `# CLAUDE.local.md

Local configuration overrides for this project.

## Local Settings

- Custom API endpoints
- Development-specific configurations
`;

/**
 * Default slash command content
 */
const createSlashCommandContent = (
  name: string,
  description = '',
) => `# /${name}

${description || `Execute the ${name} command`}

## Usage

\`\`\`bash
/${name} [options]
\`\`\`
`;

// Removed createTestFixture - not currently used

/**
 * Create a Claude project fixture with typical project structure
 */
export async function createClaudeProjectFixture(options?: {
  projectName?: string;
  includeLocal?: boolean;
  includeCommands?: boolean;
  additionalFiles?: FileTree;
}): Promise<FsFixture> {
  const {
    projectName = 'test-project',
    includeLocal = false,
    includeCommands = false,
    additionalFiles = {},
  } = options || {};

  const fileTree: FileTree = {
    [projectName]: {
      'CLAUDE.md': DEFAULT_CLAUDE_MD,
      'package.json': JSON.stringify(
        {
          name: projectName,
          version: '1.0.0',
          type: 'module',
        },
        null,
        2,
      ),
      src: {
        'index.ts': 'export const hello = () => "Hello, World!";',
        'utils.ts': 'export const noop = () => {};',
      },
      ...additionalFiles,
    },
  };

  // Add local config if requested
  if (includeLocal) {
    const projectFiles = fileTree[projectName] as FileTree;
    projectFiles['CLAUDE.local.md'] = DEFAULT_CLAUDE_LOCAL_MD;
  }

  // Add commands if requested
  if (includeCommands) {
    const projectFiles = fileTree[projectName] as FileTree;
    projectFiles['.claude'] = {
      commands: {
        'test.md': createSlashCommandContent('test', 'Run project tests'),
        'build.md': createSlashCommandContent('build', 'Build the project'),
        'deploy.md': createSlashCommandContent(
          'deploy',
          'Deploy to production',
        ),
      },
    };
  }

  return createFixture(fileTree);
}

// Removed createMultiProjectFixture - not currently used

// Removed createGlobalClaudeFixture - not currently used

/**
 * High-order function to run tests with a temporary fixture
 * Automatically cleans up using TypeScript 'using' keyword
 */
export async function withTempFixture<T>(
  fileTree: FileTree,
  callback: (fixture: FsFixture) => Promise<T>,
): Promise<T> {
  await using fixture = await createFixture(fileTree);
  return callback(fixture);
}

/**
 * Common test pattern helper for DRY - simplifies fixture-based tests
 */
export async function testWithFixture<T>(
  fixtureDef: FileTree,
  testFn: (fixture: FsFixture) => Promise<T>,
): Promise<T> {
  return withTempFixture(fixtureDef, testFn);
}

/**
 * Cached version of withTempFixture for identical fixture structures.
 * Reuses existing fixtures when structure matches, improving test performance.
 * Note: Only use for read-only tests as fixtures are shared.
 */
export async function withCachedReadOnlyFixture<T>(
  fileTree: FileTree,
  callback: (fixture: FsFixture) => Promise<T>,
): Promise<T> {
  const structureHash = hashFileTree(fileTree);

  // Check if we have a cached fixture with same structure
  let fixture = fixturePool.get(structureHash);

  if (!fixture) {
    // Create new fixture and cache it
    fixture = await createFixture(fileTree);
    fixturePool.set(structureHash, fixture);
  }

  // Execute callback with cached fixture
  // Note: We don't use 'using' here as we want to keep the fixture alive
  return callback(fixture);
}

/**
 * Clear the fixture cache. Call this after test suites complete.
 */
export async function clearFixtureCache(): Promise<void> {
  const fixtures = Array.from(fixturePool.values());
  fixturePool.clear();

  // Clean up all cached fixtures
  await Promise.all(fixtures.map((fixture) => fixture[Symbol.asyncDispose]()));
}

// Removed createFixtureClaudeFile - not currently used

// Removed createFixtureSlashCommand - not currently used

/**
 * Utility to create a complex project structure for testing
 */
export async function createComplexProjectFixture(): Promise<FsFixture> {
  return createFixture({
    'my-app': {
      'CLAUDE.md': DEFAULT_CLAUDE_MD,
      'CLAUDE.local.md': DEFAULT_CLAUDE_LOCAL_MD,
      '.claude': {
        commands: {
          'dev.md': createSlashCommandContent(
            'dev',
            'Start development server',
          ),
          'test.md': createSlashCommandContent('test', 'Run tests'),
          'lint.md': createSlashCommandContent('lint', 'Run linter'),
          production: {
            'deploy.md': createSlashCommandContent(
              'deploy',
              'Deploy to production',
            ),
            'rollback.md': createSlashCommandContent(
              'rollback',
              'Rollback deployment',
            ),
          },
        },
      },
      src: {
        components: {
          'Button.tsx':
            'export const Button = () => <button>Click me</button>;',
          'Input.tsx': 'export const Input = () => <input />;',
        },
        utils: {
          'helpers.ts': 'export const helper = () => {};',
          'constants.ts': 'export const API_URL = "https://api.example.com";',
        },
        'index.ts': 'export { Button } from "./components/Button";',
        'App.tsx': 'export const App = () => <div>Hello</div>;',
      },
      tests: {
        'App.test.tsx': 'test("App renders", () => {});',
      },
      'package.json': JSON.stringify(
        {
          name: 'my-app',
          version: '2.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            test: 'vitest',
          },
          dependencies: {
            react: '^18.0.0',
            typescript: '^5.0.0',
          },
        },
        null,
        2,
      ),
      'README.md': '# My App\n\nAwesome application',
      '.gitignore': 'node_modules\ndist\n.env',
    },
  });
}

/**
 * Common E2E test fixture with standard project structure
 * Used across multiple E2E tests for consistency
 */
export async function createE2ETestFixture(
  projectName = 'test-project',
): Promise<FsFixture> {
  return createFixture({
    [projectName]: {
      'CLAUDE.md': DEFAULT_CLAUDE_MD,
      'CLAUDE.local.md': DEFAULT_CLAUDE_LOCAL_MD,
      docs: {
        'README.md': '# README\n\nProject documentation',
      },
      '.claude': {
        commands: {
          'deploy.md': createSlashCommandContent(
            'deploy',
            'Deploy to production\n\n## Usage\n`/deploy [env]`',
          ),
          'test.md': createSlashCommandContent(
            'test',
            'Run tests\n\n## Usage\n`/test`',
          ),
        },
      },
    },
  });
}

/**
 * Create fixture with slash commands only (no CLAUDE.md files)
 */
export async function createSlashCommandsFixture(
  projectName = 'slash-project',
): Promise<FsFixture> {
  return createFixture({
    [projectName]: {
      '.claude': {
        commands: {
          'deploy.md': createSlashCommandContent(
            'deploy',
            'Deploy to production',
          ),
          'test.md': createSlashCommandContent('test', 'Run tests'),
          production: {
            'rollback.md': createSlashCommandContent(
              'rollback',
              'Rollback deployment',
            ),
          },
        },
      },
    },
  });
}

/**
 * Create fixture with mixed file types for testing file type detection
 */
export async function createMixedFilesFixture(
  projectName = 'mixed-project',
): Promise<FsFixture> {
  return createFixture({
    [projectName]: {
      'CLAUDE.md': DEFAULT_CLAUDE_MD,
      'CLAUDE.local.md': DEFAULT_CLAUDE_LOCAL_MD,
      '.claude': {
        'CLAUDE.md': '# Global Config',
        commands: {
          'test.md': createSlashCommandContent('test'),
        },
      },
    },
  });
}

/**
 * Create deeply nested project structure for testing recursive scanning
 */
export async function createNestedProjectFixture(
  projectName = 'nested-project',
): Promise<FsFixture> {
  return createFixture({
    [projectName]: {
      'CLAUDE.md': '# Root Config',
      src: {
        'CLAUDE.md': '# Src Config',
        components: {
          'CLAUDE.md': '# Component Config',
        },
      },
      '.claude': {
        commands: {
          'build.md': createSlashCommandContent('build'),
          dev: {
            'start.md': createSlashCommandContent('start'),
            'watch.md': createSlashCommandContent('watch'),
          },
        },
      },
    },
  });
}

// Removed createLargeProjectFixture - not currently used
// Can be re-added when performance testing is needed

/**
 * E2E test helper that sets up common test environment
 * Handles directory changes and HOME mocking
 */
export async function withE2ETestEnvironment<T>(
  fixture: FsFixture,
  projectPath: string,
  callback: () => Promise<T>,
): Promise<T> {
  const originalCwd = process.cwd();
  const originalHome = process.env.HOME;

  try {
    // Change to test project directory
    process.chdir(fixture.getPath(projectPath));

    // Mock HOME to prevent scanning outside test directory
    process.env.HOME = fixture.path;

    return await callback();
  } finally {
    // Restore original state
    process.chdir(originalCwd);
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    }
  }
}

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  describe('test-fixture-helpers', () => {
    // Removed test for createTestFixture

    test('createClaudeProjectFixture creates project structure', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'test-app',
        includeLocal: true,
        includeCommands: true,
      });

      expect(await fixture.exists('test-app/CLAUDE.md')).toBe(true);
      expect(await fixture.exists('test-app/CLAUDE.local.md')).toBe(true);
      expect(await fixture.exists('test-app/.claude/commands/test.md')).toBe(
        true,
      );
      expect(await fixture.exists('test-app/src/index.ts')).toBe(true);
    });

    test('withTempFixture provides automatic cleanup', async () => {
      let fixturePath: string | undefined;

      const result = await withTempFixture(
        { 'test.txt': 'Hello' },
        async (fixture) => {
          fixturePath = fixture.path;
          expect(await fixture.exists('test.txt')).toBe(true);
          return 'success';
        },
      );

      expect(result).toBe('success');
      // Fixture should be cleaned up automatically
      if (fixturePath) {
        const { access } = await import('node:fs/promises');
        await expect(access(fixturePath)).rejects.toThrow();
      }
    });

    test('createComplexProjectFixture creates realistic structure', async () => {
      await using fixture = await createComplexProjectFixture();

      // Check various parts of the complex structure
      expect(await fixture.exists('my-app/CLAUDE.md')).toBe(true);
      expect(
        await fixture.exists('my-app/.claude/commands/production/deploy.md'),
      ).toBe(true);
      expect(await fixture.exists('my-app/src/components/Button.tsx')).toBe(
        true,
      );
      expect(await fixture.exists('my-app/tests/App.test.tsx')).toBe(true);

      // Check file contents
      const claudeMd = await fixture.readFile('my-app/CLAUDE.md', 'utf-8');
      expect(claudeMd).toContain('CLAUDE.md');
    });
  });
}
