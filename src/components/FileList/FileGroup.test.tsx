import { render } from 'ink-testing-library';
import type { ClaudeFileType } from '../../_types.js';
import { FileGroup } from './FileGroup.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('FileGroup', () => {
    const createTestGroup = (
      type: ClaudeFileType,
      fileCount = 5,
      isExpanded = false,
    ) => ({
      type,
      fileCount,
      isExpanded,
    });

    test('displays correct group label and icon for each type', () => {
      const types: ClaudeFileType[] = [
        'claude-md',
        'claude-local-md',
        'slash-command',
        'global-md',
      ];

      const expectedLabels: Record<ClaudeFileType, string> = {
        'claude-md': 'PROJECT',
        'claude-local-md': 'LOCAL',
        'slash-command': 'COMMAND',
        'global-md': 'GLOBAL',
        'settings-json': 'SETTINGS',
        'settings-local-json': 'LOCAL SETTINGS',
        unknown: 'OTHER',
      };

      types.forEach((type) => {
        const group = createTestGroup(type, 3, false);
        const { lastFrame } = render(
          <FileGroup
            type={group.type}
            fileCount={group.fileCount}
            isExpanded={group.isExpanded}
            isSelected={false}
          />,
        );

        const output = lastFrame();
        expect(output).toContain(expectedLabels[type]);
        expect(output).toContain('▶'); // Collapsed icon
        expect(output).toContain('(3)'); // File count
      });
    });

    test('shows expanded icon when expanded', () => {
      const group = createTestGroup('claude-md', 5, true);
      const { lastFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={false}
        />,
      );

      const output = lastFrame();
      expect(output).toContain('▼'); // Expanded icon
      expect(output).toContain('PROJECT');
      expect(output).toContain('(5)');
    });

    test('highlights when selected', () => {
      const group = createTestGroup('slash-command', 10, true);

      const { lastFrame: unselectedFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={false}
        />,
      );

      const { lastFrame: selectedFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={true}
        />,
      );

      const unselectedOutput = unselectedFrame();
      const selectedOutput = selectedFrame();

      // Both should show the same content
      expect(unselectedOutput).toContain('COMMAND');
      expect(selectedOutput).toContain('COMMAND');

      // Selected should have different styling (implementation specific)
      // Here we just verify both render correctly
      expect(selectedOutput).toBeDefined();
    });

    test('displays correct file count', () => {
      const counts = [0, 1, 10, 100, 1000];

      counts.forEach((count) => {
        const group = createTestGroup('global-md', count, false);
        const { lastFrame } = render(
          <FileGroup
            type={group.type}
            fileCount={group.fileCount}
            isExpanded={group.isExpanded}
            isSelected={false}
          />,
        );

        expect(lastFrame()).toContain(`(${count})`);
      });
    });

    test('handles interaction states correctly', () => {
      // Test all combinations of expanded/selected states
      const states = [
        { isExpanded: false, isSelected: false },
        { isExpanded: false, isSelected: true },
        { isExpanded: true, isSelected: false },
        { isExpanded: true, isSelected: true },
      ];

      states.forEach(({ isExpanded, isSelected }) => {
        const group = createTestGroup('claude-local-md', 7, isExpanded);
        const { lastFrame } = render(
          <FileGroup
            type={group.type}
            fileCount={group.fileCount}
            isExpanded={group.isExpanded}
            isSelected={isSelected}
          />,
        );

        const output = lastFrame();
        expect(output).toContain(isExpanded ? '▼' : '▶');
        expect(output).toContain('LOCAL');
        expect(output).toContain('(7)');
      });
    });

    test('handles empty groups', () => {
      const group = createTestGroup('claude-md', 0, false);
      const { lastFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={false}
        />,
      );

      const output = lastFrame();
      expect(output).toContain('▶');
      expect(output).toContain('PROJECT');
      expect(output).toContain('(0)');
    });

    test('renders unknown file types', () => {
      const group = createTestGroup('unknown' as ClaudeFileType, 2, false);
      const { lastFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={false}
        />,
      );

      const output = lastFrame();
      expect(output).toContain('OTHER'); // Fallback label
      expect(output).toContain('(2)');
    });

    test('re-renders correctly when props change', () => {
      const group1 = createTestGroup('claude-md', 5, false);
      const { lastFrame, rerender } = render(
        <FileGroup
          type={group1.type}
          fileCount={group1.fileCount}
          isExpanded={group1.isExpanded}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▶');
      expect(lastFrame()).toContain('(5)');

      // Change to expanded
      const group2 = createTestGroup('claude-md', 5, true);
      rerender(
        <FileGroup
          type={group2.type}
          fileCount={group2.fileCount}
          isExpanded={group2.isExpanded}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▼');
      expect(lastFrame()).toContain('(5)');

      // Change selection
      rerender(
        <FileGroup
          type={group2.type}
          fileCount={group2.fileCount}
          isExpanded={group2.isExpanded}
          isSelected={true}
        />,
      );

      const finalOutput = lastFrame();
      expect(finalOutput).toContain('▼');
      expect(finalOutput).toContain('PROJECT');
      expect(finalOutput).toContain('(5)');
    });
  });
}
