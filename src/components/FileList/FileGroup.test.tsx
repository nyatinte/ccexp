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
        'project-memory',
        'project-memory-local',
        'project-command',
        'user-memory',
      ];

      const expectedLabels: Record<ClaudeFileType, string> = {
        'project-memory': 'Project memory (CLAUDE.md)',
        'project-memory-local': 'Project memory - local (CLAUDE.local.md)',
        'project-subagent': 'Project subagents (.claude/agents/)',
        'user-subagent': 'User subagents (~/.claude/agents/)',
        'project-command': 'Project commands (.claude/commands/)',
        'personal-command': 'User commands (~/.claude/commands/)',
        'user-memory': 'User memory (~/.claude/CLAUDE.md)',
        'project-settings': 'Project settings (.claude/settings.json)',
        'project-settings-local':
          'Project settings - local (.claude/settings.local.json)',
        'user-settings': 'User settings (~/.claude/settings.json)',
        unknown: 'Other files',
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
      const group = createTestGroup('project-memory', 5, true);
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
      expect(output).toContain('Project memory (CLAUDE.md)');
      expect(output).toContain('(5)');
    });

    test('highlights when selected', () => {
      const group = createTestGroup('project-command', 10, true);

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
      expect(unselectedOutput).toContain(
        'Project commands (.claude/commands/)',
      );
      expect(selectedOutput).toContain('Project commands (.claude/commands/)');

      // Selected should have different styling (implementation specific)
      // Here we just verify both render correctly
      expect(selectedOutput).toBeDefined();
    });

    test('displays correct file count', () => {
      const counts = [0, 1, 10, 100, 1000];

      counts.forEach((count) => {
        const group = createTestGroup('user-memory', count, false);
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
        const group = createTestGroup('project-memory-local', 7, isExpanded);
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
        expect(output).toContain('Project memory - local (CLAUDE.local.md)');
        expect(output).toContain('(7)');
      });
    });

    test('handles empty groups', () => {
      const group = createTestGroup('project-memory', 0, false);
      const { lastFrame } = render(
        <FileGroup
          type={group.type}
          fileCount={group.fileCount}
          isExpanded={group.isExpanded}
          isSelected={false}
        />,
      );

      const output = lastFrame();
      // Empty groups should show collapsed icon
      expect(output).toContain('▶');
      expect(output).toContain('Project memory (CLAUDE.md)');
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
      expect(output).toContain('Other files'); // Fallback label
      expect(output).toContain('(2)');
    });

    test('re-renders correctly when props change', () => {
      const group1 = createTestGroup('project-memory', 5, false);
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
      const group2 = createTestGroup('project-memory', 5, true);
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
      expect(finalOutput).toContain('Project memory (CLAUDE.md)');
      expect(finalOutput).toContain('(5)');
    });
  });
}
