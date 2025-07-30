import { render } from 'ink-testing-library';
import type { ClaudeFileInfo } from '../../_types.js';
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
  });
}
