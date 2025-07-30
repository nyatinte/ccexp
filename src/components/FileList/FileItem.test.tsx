import { render } from 'ink-testing-library';
import type { ClaudeFileInfo } from '../../_types.js';
import { createClaudeFilePath } from '../../_types.js';
import { FileItem } from './FileItem.js';

// Helper to create ClaudeFileInfo for testing
const createMockFile = (
  name: string,
  type: ClaudeFileInfo['type'],
  options?: {
    path?: string;
    basePath?: string;
    relativePath?: string;
    size?: number;
  },
): ClaudeFileInfo => {
  let filePath: string;
  if (options?.path) {
    filePath = options.path;
  } else if (options?.basePath && options?.relativePath) {
    filePath = `${options.basePath}/${options.relativePath}`;
  } else if (options?.basePath) {
    filePath = `${options.basePath}/${name}`;
  } else {
    filePath = `/test/${name}`;
  }

  return {
    path: createClaudeFilePath(filePath),
    type,
    size: options?.size ?? 1024,
    lastModified: new Date('2024-01-01'),
    commands: [],
    tags: [],
  };
};

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('FileItem', () => {
    test('displays CLAUDE.md file', () => {
      const file = createMockFile('CLAUDE.md', 'project-memory');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md'); // with parent directory
      expect(lastFrame()).toContain('📝'); // project-memory icon
    });

    test('displays CLAUDE.local.md file', () => {
      const file = createMockFile('CLAUDE.local.md', 'project-memory-local');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.local.md');
      expect(lastFrame()).toContain('🔒');
    });

    test('displays slash command file', () => {
      const file = createMockFile('test-command.md', 'project-command');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test-command'); // .md extension is removed
      expect(lastFrame()).toContain('⚡'); // project-command icon
    });

    test('displays selected state', () => {
      const file = createMockFile('CLAUDE.md', 'project-memory');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={true} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      // Verify visual representation of selected state
    });

    test('displays focused state', () => {
      const file = createMockFile('CLAUDE.md', 'project-memory');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={true} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      expect(lastFrame()).toContain('► '); // focus prefix
    });

    test('displays selected and focused state', () => {
      const file = createMockFile('CLAUDE.md', 'project-memory');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={true} isFocused={true} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      expect(lastFrame()).toContain('► '); // focus prefix
    });

    test('should truncate very long file names properly', () => {
      const longFileName =
        'this-is-a-very-very-very-very-very-very-very-very-very-very-long-filename-that-should-be-truncated-properly-without-breaking-the-layout.md';
      const file = createMockFile(longFileName, 'claude-md', {
        basePath: '/Users/test/projects',
        size: 100,
      });
      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('projects/');
      expect(lastFrame()).toContain('PROJECT');

      // Check that the output doesn't overflow (it should be on a single line)
      const lines = lastFrame()?.split('\n') || [];
      const itemLine = lines.find((line) => line.includes('projects/'));
      expect(itemLine).toBeDefined();
    });

    test('should handle very long directory paths', () => {
      const file = createMockFile('CLAUDE.md', 'claude-md', {
        basePath:
          '/Users/test/very/deep/nested/directory/structure/with/many/levels/that/go/on/and/on/and/on',
        size: 100,
      });
      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('CLAUDE.md');
      expect(lastFrame()).toContain('PROJECT');

      // Parent directory should be the last segment
      expect(lastFrame()).toContain('on/CLAUDE.md');
    });

    test('should maintain layout with extremely long paths', () => {
      const segments = Array(20).fill('very-long-directory-name');
      const longPath = segments.join('/');
      const file = createMockFile('CLAUDE.md', 'claude-md', {
        basePath: `/Users/test/${longPath}`,
        size: 100,
      });

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('PROJECT');
      expect(lastFrame()).toContain('CLAUDE.md');
    });
  });
}
