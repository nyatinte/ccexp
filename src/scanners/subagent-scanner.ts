import type { Stats } from 'node:fs';
import { homedir } from 'node:os';
import matter from 'gray-matter';
import { FILE_SIZE_LIMITS } from '../lib/constants.js';
import type { ScanOptions, SubAgentInfo } from '../lib/types.js';
import { BaseFileScanner } from './base-file-scanner.js';
import { findSubAgents } from './fast-scanner.js';

class SubAgentScanner extends BaseFileScanner<SubAgentInfo> {
  protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_SUBAGENT_SIZE;
  protected readonly fileType = 'Subagent';

  protected async parseContent(
    filePath: string,
    content: string,
    stats: Stats,
  ): Promise<SubAgentInfo | null> {
    try {
      const parsed = matter(content);

      const scope = filePath.includes(`${homedir()}/.claude/agents/`)
        ? ('user' as const)
        : ('project' as const);

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
  const { withTempFixture } = await import('../test/utils/fixture-helpers.js');

  describe('subagent-scanner', () => {
    test('should parse valid subagent file with frontmatter', async () => {
      const validContent = `---
name: test-agent
description: A test subagent
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
          });

          // Find test agent by name and scope (project scope means it's from our test directory)
          const testAgent = results.find(
            (r) => r.name === 'test-agent' && r.scope === 'project',
          );

          expect(testAgent).toBeDefined();
          expect(testAgent?.description).toBe('A test subagent');
          expect(testAgent?.tools).toEqual(['read', 'write']);
          expect(testAgent?.scope).toBe('project');

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
          });

          // Find broken agent by name and scope
          const brokenAgent = results.find(
            (r) => r.name === 'broken-agent' && r.scope === 'project',
          );

          expect(brokenAgent).toBeDefined();
          expect(brokenAgent?.description).toBeUndefined();
          expect(brokenAgent?.tools).toBeUndefined();
          expect(brokenAgent?.scope).toBe('project');

          return f;
        },
      );
    });
  });
}
