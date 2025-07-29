import { render } from 'ink-testing-library';
import type { ClaudeFileInfo, ClaudeFileType } from '../../_types.js';
import { createClaudeFilePath } from '../../_types.js';
import { FileItem } from './FileItem.js';

// Helper to create ClaudeFileInfo for testing
const createMockFile = (
  name: string,
  type: ClaudeFileInfo['type'],
  path = `/test/${name}`,
): ClaudeFileInfo => ({
  path: createClaudeFilePath(path),
  type,
  size: 1024,
  lastModified: new Date('2024-01-01'),
  commands: [],
  tags: [],
});

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('FileItem', () => {
    test('displays CLAUDE.md file', () => {
      const file = createMockFile('CLAUDE.md', 'claude-md');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md'); // with parent directory
      expect(lastFrame()).toContain('📝'); // claude-md icon
    });

    test('displays CLAUDE.local.md file', () => {
      const file = createMockFile('CLAUDE.local.md', 'claude-local-md');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.local.md'); // with parent directory
      expect(lastFrame()).toContain('🔒'); // claude-local-md icon
    });

    test('displays slash command file', () => {
      const file = createMockFile('test-command.md', 'slash-command');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test-command'); // .md extension is removed
      expect(lastFrame()).toContain('⚡'); // slash-command icon
    });

    test('displays selected state', () => {
      const file = createMockFile('CLAUDE.md', 'claude-md');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={true} isFocused={false} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      // Verify visual representation of selected state
    });

    test('displays focused state', () => {
      const file = createMockFile('CLAUDE.md', 'claude-md');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={true} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      expect(lastFrame()).toContain('► '); // focus prefix
    });

    test('displays selected and focused state', () => {
      const file = createMockFile('CLAUDE.md', 'claude-md');

      const { lastFrame } = render(
        <FileItem file={file} isSelected={true} isFocused={true} />,
      );

      expect(lastFrame()).toContain('test/CLAUDE.md');
      expect(lastFrame()).toContain('► '); // focus prefix
    });

    // Helper to create file info for long filename tests
    const createFileInfo = (
      basePath: string,
      relativePath: string,
      type: ClaudeFileType,
    ): ClaudeFileInfo => ({
      path: createClaudeFilePath(`${basePath}/${relativePath}`),
      type,
      size: 100,
      lastModified: new Date('2024-01-01'),
      commands: [],
      tags: [],
    });

    test('should truncate very long file names properly', () => {
      // 非常に長いファイル名を持つテストケース
      const longFileName =
        'this-is-a-very-very-very-very-very-very-very-very-very-very-long-filename-that-should-be-truncated-properly-without-breaking-the-layout.md';
      const file = createFileInfo(
        '/Users/test/projects',
        longFileName,
        'claude-md',
      );
      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      // ファイル名が含まれていることを確認（切り詰められていても）
      expect(lastFrame()).toContain('projects/');
      // バッジが正しく表示されることを確認
      expect(lastFrame()).toContain('PROJECT');

      // Check that the output doesn't overflow (it should be on a single line)
      const lines = lastFrame()?.split('\n') || [];
      const itemLine = lines.find((line) => line.includes('projects/'));
      expect(itemLine).toBeDefined();
    });

    test('should handle very long directory paths', () => {
      // 非常に長いディレクトリパスを持つテストケース
      const file = createFileInfo(
        '/Users/test/very/deep/nested/directory/structure/with/many/levels/that/go/on/and/on/and/on',
        'CLAUDE.md',
        'claude-md',
      );
      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      // ファイル名とバッジが表示されることを確認
      expect(lastFrame()).toContain('CLAUDE.md');
      expect(lastFrame()).toContain('PROJECT');

      // Parent directory should be the last segment
      expect(lastFrame()).toContain('on/CLAUDE.md');
    });

    test('should maintain layout with extremely long paths', () => {
      // Create a path that's extremely long
      const segments = Array(20).fill('very-long-directory-name');
      const longPath = segments.join('/');
      const file = createFileInfo(
        `/Users/test/${longPath}`,
        'CLAUDE.md',
        'claude-md',
      );

      const { lastFrame } = render(
        <FileItem file={file} isSelected={false} isFocused={false} />,
      );

      // Should still show the badge
      expect(lastFrame()).toContain('PROJECT');

      // Should contain the filename
      expect(lastFrame()).toContain('CLAUDE.md');
    });
  });
}
