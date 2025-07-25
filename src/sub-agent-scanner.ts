import type { Stats } from 'node:fs';
import { homedir } from 'node:os';
import matter from 'gray-matter';
import { FILE_SIZE_LIMITS } from './_consts.ts';
import type { ClaudeFileInfo, ScanOptions, SubAgentInfo } from './_types.ts';
import { BaseFileScanner } from './base-file-scanner.ts';
import { findSubAgents } from './fast-scanner.ts';

class SubAgentScanner extends BaseFileScanner<SubAgentInfo> {
  protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_SLASH_COMMAND_SIZE;
  protected readonly fileType = 'Sub-agent';

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<SubAgentInfo | null> {
    try {
      // Parse YAML frontmatter
      const parsed = matter(content);

      // Determine scope based on file path
      const scope = filePath.includes(`${homedir()}/.claude/agents/`)
        ? ('user' as const)
        : ('project' as const);

      // Extract name from frontmatter or filename
      const name =
        parsed.data.name ||
        filePath.split('/').pop()?.replace('.md', '') ||
        'unnamed';

      return {
        name,
        scope,
        description: parsed.data.description,
        tools: parsed.data.tools,
        filePath,
        lastModified: stats.mtime,
      };
    } catch (_error) {
      // Invalid format - return basic info without metadata
      const scope = filePath.includes(`${homedir()}/.claude/agents/`)
        ? ('user' as const)
        : ('project' as const);

      const name = filePath.split('/').pop()?.replace('.md', '') || 'unnamed';

      return {
        name,
        scope,
        filePath,
        lastModified: stats.mtime,
      };
    }
  }
}

// Singleton instance
const scanner = new SubAgentScanner();

/**
 * Scan for sub-agent files
 */
export const scanSubAgents = async (
  options: ScanOptions = {},
): Promise<SubAgentInfo[]> => {
  const filePaths = await findSubAgents(options);
  const results = await Promise.all(
    filePaths.map((filePath) => scanner.processFile(filePath)),
  );

  return results.filter((result): result is SubAgentInfo => result !== null);
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const { withTempFixture } = await import('./test-fixture-helpers.js');

  describe('sub-agent-scanner', () => {
    test('should parse valid sub-agent file with frontmatter', async () => {
      const validContent = `---
name: test-agent
description: A test sub-agent
tools: ['read', 'write']
---

This is the system prompt for the test agent.`;

      await using _fixture = await withTempFixture(
        {
          '.claude': {
            agents: {
              'test-agent.md': validContent,
            },
          },
        },
        async (f) => {
          const results = await scanSubAgents({
            path: f.path,
            recursive: false,
          });

          expect(results.length).toBe(1);
          expect(results[0]?.name).toBe('test-agent');
          expect(results[0]?.description).toBe('A test sub-agent');
          expect(results[0]?.tools).toEqual(['read', 'write']);
          expect(results[0]?.scope).toBe('project');

          return f;
        },
      );
    });

    test('should handle invalid frontmatter gracefully', async () => {
      const invalidContent = `This is not valid YAML frontmatter
---
broken: yaml: here
---

System prompt content.`;

      await using _fixture = await withTempFixture(
        {
          '.claude': {
            agents: {
              'broken-agent.md': invalidContent,
            },
          },
        },
        async (f) => {
          const results = await scanSubAgents({
            path: f.path,
            recursive: false,
          });

          expect(results.length).toBe(1);
          expect(results[0]?.name).toBe('broken-agent');
          expect(results[0]?.description).toBeUndefined();
          expect(results[0]?.tools).toBeUndefined();
          expect(results[0]?.scope).toBe('project');

          return f;
        },
      );
    });
  });
}
