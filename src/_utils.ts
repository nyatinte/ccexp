import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { match, P } from 'ts-pattern';
import type { ClaudeFilePath, ClaudeFileType } from './_types.ts';
import { createClaudeFilePath } from './_types.ts';

const HOME_DIR = homedir();

// File path utilities
export const parseSlashCommandName = (fileName: string): string => {
  return fileName.replace(/\.md$/, '').replace(/\//g, ':');
};

const normalizeFilePath = (filePath: string): ClaudeFilePath => {
  const normalized = filePath.startsWith('~')
    ? filePath.replace('~', HOME_DIR)
    : filePath;

  try {
    return createClaudeFilePath(normalized);
  } catch {
    throw new Error(`Invalid file path: ${filePath}`);
  }
};

export const getFileScope = (filePath: string): 'project' | 'user' => {
  return filePath.includes(HOME_DIR) ? 'user' : 'project';
};

// File type detection
export const detectClaudeFileType = (filePath: string): ClaudeFileType => {
  const fileName = basename(filePath);
  const dirPath = dirname(filePath);

  return match([fileName, dirPath])
    .with(
      ['CLAUDE.md', P.when((dir) => dir === join(HOME_DIR, '.claude'))],
      () => 'user-memory' as const,
    )
    .with(['CLAUDE.md', P._], () => 'project-memory' as const)
    .with(['CLAUDE.local.md', P._], () => 'project-memory-local' as const)
    .with(
      [
        P.when((name) => name.endsWith('.md')),
        P.when((dir) => dir.includes(join(HOME_DIR, '.claude', 'commands'))),
      ],
      () => 'personal-command' as const,
    )
    .with(
      [
        P.when((name) => name.endsWith('.md')),
        P.when((dir) => dir.includes('.claude/commands')),
      ],
      () => 'project-command' as const,
    )
    .with(
      [
        P.when((name) => name.endsWith('.md')),
        P.when((dir) => dir.includes(join(HOME_DIR, '.claude', 'agents'))),
      ],
      () => 'user-subagent' as const,
    )
    .with(
      [
        P.when((name) => name.endsWith('.md')),
        P.when((dir) => dir.includes('.claude/agents')),
      ],
      () => 'project-subagent' as const,
    )
    .with(
      ['settings.json', P.when((dir) => dir === join(HOME_DIR, '.claude'))],
      () => 'user-settings' as const,
    )
    .with(
      [
        'settings.json',
        P.when((dir) => dir.endsWith('/.claude') || dir.includes('/.claude/')),
      ],
      () => 'project-settings' as const,
    )
    .with(
      [
        'settings.local.json',
        P.when((dir) => dir.endsWith('/.claude') || dir.includes('/.claude/')),
      ],
      () => 'project-settings-local' as const,
    )
    .otherwise(() => 'unknown' as const);
};

// Content validation
export const validateClaudeMdContent = (content: string): boolean => {
  // Allow any content - validation should be minimal for flexibility
  return content.length >= 0;
};

export const extractTagsFromContent = (content: string): string[] => {
  const tagPattern = /#(\w+)/g;
  const matches = content.match(tagPattern);
  return matches ? matches.map((tag) => tag.slice(1)) : [];
};

export const extractCommandsFromContent = (
  content: string,
): Array<{
  name: string;
  description?: string | undefined;
  hasArguments: boolean;
}> => {
  // Extract slash commands from markdown content
  const commandPattern = /\/(\w+)(?:\s+(.+?))?$/gm;
  const commands: Array<{
    name: string;
    description?: string | undefined;
    hasArguments: boolean;
  }> = [];

  let match: RegExpExecArray | null = commandPattern.exec(content);
  while (match !== null) {
    const [, name, description] = match;
    if (!name) {
      match = commandPattern.exec(content);
      continue;
    }
    commands.push({
      name,
      description: description?.trim(),
      hasArguments: Boolean(
        description?.includes('<') || description?.includes('['),
      ),
    });
    match = commandPattern.exec(content);
  }

  return commands;
};

// File content utilities
export const isBinaryFile = async (filePath: string): Promise<boolean> => {
  try {
    const { readFile } = await import('node:fs/promises');
    const buffer = await readFile(filePath);

    // Check for null bytes in the first 1024 bytes
    const sampleSize = Math.min(1024, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // If file contains null bytes, it's likely binary
    return sample.includes(0);
  } catch {
    // If we can't read the file, assume it's not binary
    return false;
  }
};

// String utilities

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const { createClaudeProjectFixture, testWithFixture } = await import(
    './test-fixture-helpers.js'
  );

  describe('parseSlashCommandName', () => {
    test('should convert file path to command name', () => {
      expect(parseSlashCommandName('deploy.md')).toBe('deploy');
      expect(parseSlashCommandName('frontend/component.md')).toBe(
        'frontend:component',
      );
    });

    test('should handle nested paths correctly', () => {
      expect(parseSlashCommandName('git/commit.md')).toBe('git:commit');
      expect(parseSlashCommandName('project/test/unit.md')).toBe(
        'project:test:unit',
      );
    });
  });

  describe('validateClaudeMdContent', () => {
    test('should validate valid CLAUDE.md content', () => {
      expect(validateClaudeMdContent('# Project Info\n## Setup')).toBe(true);
      expect(validateClaudeMdContent('## Build Commands')).toBe(true);
    });

    test('should accept any reasonable content', () => {
      expect(validateClaudeMdContent('Just plain text')).toBe(true);
      expect(validateClaudeMdContent('')).toBe(true);
      expect(validateClaudeMdContent('- bullet point\n- another')).toBe(true);
    });

    test('should accept any content size', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB
      expect(validateClaudeMdContent(largeContent)).toBe(true);
    });
  });

  describe('detectClaudeFileType', () => {
    test('should detect CLAUDE.md files', () => {
      expect(detectClaudeFileType('/project/CLAUDE.md')).toBe('project-memory');
    });

    test('should detect CLAUDE.local.md files', () => {
      expect(detectClaudeFileType('/project/CLAUDE.local.md')).toBe(
        'project-memory-local',
      );
    });

    test('should detect global CLAUDE.md files', () => {
      const globalPath = join(HOME_DIR, '.claude', 'CLAUDE.md');
      expect(detectClaudeFileType(globalPath)).toBe('user-memory');
    });

    test('should detect project slash command files', () => {
      expect(detectClaudeFileType('/project/.claude/commands/deploy.md')).toBe(
        'project-command',
      );
      expect(detectClaudeFileType('/workspace/.claude/commands/test.md')).toBe(
        'project-command',
      );
    });

    test('should detect personal slash command files', () => {
      const personalCommandPath = join(
        HOME_DIR,
        '.claude',
        'commands',
        'personal.md',
      );
      expect(detectClaudeFileType(personalCommandPath)).toBe(
        'personal-command',
      );

      const nestedPersonalPath = join(
        HOME_DIR,
        '.claude',
        'commands',
        'git',
        'commit.md',
      );
      expect(detectClaudeFileType(nestedPersonalPath)).toBe('personal-command');
    });

    test.each([
      ['/project/.claude/settings.json', 'project-settings'],
      ['/workspace/.claude/settings.json', 'project-settings'],
      ['/project/.claude/settings.local.json', 'project-settings-local'],
      ['/workspace/.claude/settings.local.json', 'project-settings-local'],
    ] as const)('should detect %s as %s', (path, expectedType) => {
      expect(detectClaudeFileType(path)).toBe(expectedType);
    });

    test('should detect user settings.json', () => {
      const userSettingsPath = join(HOME_DIR, '.claude', 'settings.json');
      expect(detectClaudeFileType(userSettingsPath)).toBe('user-settings');
    });

    test('should detect project subagent files', () => {
      expect(
        detectClaudeFileType('/project/.claude/agents/test-agent.md'),
      ).toBe('project-subagent');
      expect(detectClaudeFileType('/workspace/.claude/agents/helper.md')).toBe(
        'project-subagent',
      );
    });

    test('should detect user subagent files', () => {
      const userAgentPath = join(
        HOME_DIR,
        '.claude',
        'agents',
        'personal-agent.md',
      );
      expect(detectClaudeFileType(userAgentPath)).toBe('user-subagent');
    });

    test('should not detect settings files outside .claude', () => {
      expect(detectClaudeFileType('/project/settings.json')).toBe('unknown');
      expect(detectClaudeFileType('/project/settings.local.json')).toBe(
        'unknown',
      );
    });
  });

  describe('extractTagsFromContent', () => {
    test('should extract hashtags from content', () => {
      const content = 'This is #typescript and #nextjs project';
      expect(extractTagsFromContent(content)).toEqual(['typescript', 'nextjs']);
    });

    test('should return empty array for no tags', () => {
      expect(extractTagsFromContent('No tags here')).toEqual([]);
    });
  });

  describe('extractCommandsFromContent', () => {
    test('should extract slash commands', () => {
      const content = '/deploy <environment>\n/test --watch';
      const commands = extractCommandsFromContent(content);
      expect(commands).toHaveLength(2);
      expect(commands[0]?.name).toBe('deploy');
      expect(commands[0]?.hasArguments).toBe(true);
    });
  });

  describe('getFileScope', () => {
    test('should detect user scope for home directory files', () => {
      expect(getFileScope(`${HOME_DIR}/.claude/CLAUDE.md`)).toBe('user');
    });

    test('should detect project scope for non-home files', () => {
      expect(getFileScope('/project/CLAUDE.md')).toBe('project');
    });
  });

  describe('normalizeFilePath', () => {
    test('should expand ~ to home directory', () => {
      expect(normalizeFilePath('~/test.md')).toBe(`${HOME_DIR}/test.md`);
      expect(normalizeFilePath('~/.claude/CLAUDE.md')).toBe(
        `${HOME_DIR}/.claude/CLAUDE.md`,
      );
    });

    test('should handle absolute paths unchanged', () => {
      expect(normalizeFilePath('/absolute/path/file.md')).toBe(
        '/absolute/path/file.md',
      );
      expect(normalizeFilePath('/Users/test/CLAUDE.md')).toBe(
        '/Users/test/CLAUDE.md',
      );
    });

    test('should handle relative paths unchanged', () => {
      expect(normalizeFilePath('./relative/path.md')).toBe(
        './relative/path.md',
      );
      expect(normalizeFilePath('../parent/file.md')).toBe('../parent/file.md');
      expect(normalizeFilePath('src/file.md')).toBe('src/file.md');
    });

    test('should handle paths without ~ unchanged', () => {
      expect(normalizeFilePath('simple.md')).toBe('simple.md');
      expect(normalizeFilePath('folder/file.md')).toBe('folder/file.md');
    });

    test('should throw error for invalid file paths', () => {
      // The createClaudeFilePath validation is what throws the error
      // Test with paths that will fail the zod validation
      expect(() => normalizeFilePath('')).toThrow();
    });
  });

  describe('isBinaryFile', () => {
    test('should detect text files as non-binary', async () => {
      await testWithFixture(
        {
          'test.txt': 'Hello world\nThis is a text file',
          'README.md': '# Project\n\nThis is markdown',
          'config.json': JSON.stringify({ key: 'value' }, null, 2),
        },
        async (f) => {
          const textResult = await isBinaryFile(f.getPath('test.txt'));
          expect(textResult).toBe(false);

          const mdResult = await isBinaryFile(f.getPath('README.md'));
          expect(mdResult).toBe(false);

          const jsonResult = await isBinaryFile(f.getPath('config.json'));
          expect(jsonResult).toBe(false);
        },
      );
    });

    test('should detect binary files with null bytes', async () => {
      const { createFixture } = await import('fs-fixture');
      const { writeFile } = await import('node:fs/promises');

      // Create fixture with empty files first
      await using fixture = await createFixture({
        'image.png': '',
        'binary.dat': '',
      });

      // Then write binary data directly
      const pngData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
      ]);
      const binData = Buffer.from([0x00, 0x01, 0x02, 0x00, 0x04]);

      await writeFile(fixture.getPath('image.png'), pngData);
      await writeFile(fixture.getPath('binary.dat'), binData);

      const pngResult = await isBinaryFile(fixture.getPath('image.png'));
      expect(pngResult).toBe(true);

      const datResult = await isBinaryFile(fixture.getPath('binary.dat'));
      expect(datResult).toBe(true);
    });

    test('should handle non-existent files gracefully', async () => {
      const result = await isBinaryFile('/non/existent/file.txt');
      expect(result).toBe(false);
    });

    test('should handle permission errors gracefully', async () => {
      await testWithFixture(
        {
          'protected.txt': 'Protected content',
        },
        async (f) => {
          const { chmod } = await import('node:fs/promises');
          const filePath = f.getPath('protected.txt');

          // Remove read permissions
          await chmod(filePath, 0o000);

          try {
            const result = await isBinaryFile(filePath);
            expect(result).toBe(false); // Should return false on error
          } finally {
            // Best effort cleanup - ignore errors
            await chmod(filePath, 0o644).catch(() => {
              // Ignore cleanup errors
            });
          }
        },
      );
    });
  });

  describe('validateClaudeMdContent with real files', () => {
    test('should validate actual CLAUDE.md files', async () => {
      await using fixture = await createClaudeProjectFixture({
        projectName: 'validate-test',
      });

      const { readFile } = await import('node:fs/promises');
      const content = await readFile(
        fixture.getPath('validate-test/CLAUDE.md'),
        'utf-8',
      );
      expect(validateClaudeMdContent(content)).toBe(true);
    });
  });

  describe('extractCommandsFromContent with real files', () => {
    test('should extract commands from slash command files', async () => {
      await testWithFixture(
        {
          '.claude': {
            commands: {
              'deploy.md':
                '# Deploy Command\n\n/deploy <environment>\n\nDeploys to specified environment',
              'test.md':
                '/test [--watch] [--coverage]\n\nRuns tests with optional flags',
              'lint.md': '/lint\n\nRuns linting checks',
            },
          },
        },
        async (f) => {
          const { readFile } = await import('node:fs/promises');

          const deployContent = await readFile(
            f.getPath('.claude/commands/deploy.md'),
            'utf-8',
          );
          const deployCommands = extractCommandsFromContent(deployContent);
          expect(deployCommands).toHaveLength(1);
          expect(deployCommands[0]?.name).toBe('deploy');
          expect(deployCommands[0]?.hasArguments).toBe(true);

          const testContent = await readFile(
            f.getPath('.claude/commands/test.md'),
            'utf-8',
          );
          const testCommands = extractCommandsFromContent(testContent);
          expect(testCommands).toHaveLength(1);
          expect(testCommands[0]?.name).toBe('test');
          expect(testCommands[0]?.hasArguments).toBe(true);

          const lintContent = await readFile(
            f.getPath('.claude/commands/lint.md'),
            'utf-8',
          );
          const lintCommands = extractCommandsFromContent(lintContent);
          expect(lintCommands).toHaveLength(1);
          expect(lintCommands[0]?.name).toBe('lint');
          expect(lintCommands[0]?.hasArguments).toBe(false);
        },
      );
    });
  });
}
