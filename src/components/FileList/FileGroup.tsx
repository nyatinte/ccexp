import { Box, Text } from 'ink';
import React from 'react';
import { match } from 'ts-pattern';
import type { ClaudeFileType } from '../../lib/types.js';
import { theme } from '../../styles/theme.js';

type FileGroupProps = {
  readonly type: ClaudeFileType;
  readonly fileCount: number;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
};

const getGroupLabel = (type: ClaudeFileType): string => {
  return match(type)
    .with('project-memory', () => 'Project memory (CLAUDE.md)')
    .with(
      'project-memory-local',
      () => 'Project memory - local (CLAUDE.local.md)',
    )
    .with('project-subagent', () => 'Project subagents (.claude/agents/)')
    .with('user-subagent', () => 'User subagents (~/.claude/agents/)')
    .with('project-command', () => 'Project commands (.claude/commands/)')
    .with('personal-command', () => 'User commands (~/.claude/commands/)')
    .with('user-memory', () => 'User memory (~/.claude/CLAUDE.md)')
    .with('project-settings', () => 'Project settings (.claude/settings.json)')
    .with(
      'project-settings-local',
      () => 'Project settings - local (.claude/settings.local.json)',
    )
    .with('user-settings', () => 'User settings (~/.claude/settings.json)')
    .with('unknown', () => 'Other files')
    .exhaustive();
};

const getGroupColor = (type: ClaudeFileType): string => {
  return match(type)
    .with('project-memory', () => theme.fileTypes.projectMemory)
    .with('project-memory-local', () => theme.fileTypes.projectMemoryLocal)
    .with('project-subagent', () => theme.fileTypes.projectSubagent)
    .with('user-subagent', () => theme.fileTypes.userSubagent)
    .with('project-command', () => theme.fileTypes.projectCommand)
    .with('personal-command', () => theme.fileTypes.personalCommand)
    .with('user-memory', () => theme.fileTypes.userMemory)
    .with('project-settings', () => theme.fileTypes.projectSettings)
    .with('project-settings-local', () => theme.fileTypes.projectSettingsLocal)
    .with('user-settings', () => theme.fileTypes.userSettings)
    .with('unknown', () => theme.fileTypes.unknown)
    .exhaustive();
};

export const FileGroup = React.memo(function FileGroup({
  type,
  fileCount,
  isExpanded,
  isSelected,
}: FileGroupProps): React.JSX.Element {
  const label = getGroupLabel(type);
  const color = getGroupColor(type);
  const expandIcon = isExpanded ? '▼' : '▶';

  return (
    <Box>
      {isSelected ? (
        <Text
          backgroundColor={theme.selection.backgroundColor}
          color={theme.selection.color}
        >
          {expandIcon} {label} ({fileCount})
        </Text>
      ) : (
        <Text color={color} bold>
          {expandIcon} {label} ({fileCount})
        </Text>
      )}
    </Box>
  );
});

// InSource Tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const { render } = await import('ink-testing-library');

  describe('FileGroup', () => {
    test('should render group with correct label', () => {
      const { lastFrame } = render(
        <FileGroup
          type="project-memory"
          fileCount={5}
          isExpanded={true}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▼ Project memory (CLAUDE.md) (5)');
    });

    test('should show collapsed icon when not expanded', () => {
      const { lastFrame } = render(
        <FileGroup
          type="project-memory"
          fileCount={3}
          isExpanded={false}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▶ Project memory (CLAUDE.md) (3)');
    });

    test('should highlight when selected', () => {
      const { lastFrame } = render(
        <FileGroup
          type="project-command"
          fileCount={10}
          isExpanded={true}
          isSelected={true}
        />,
      );

      // Selected groups should have different styling
      expect(lastFrame()).toContain(
        '▼ Project commands (.claude/commands/) (10)',
      );
    });

    test('should show collapsed icon for empty groups', () => {
      const { lastFrame } = render(
        <FileGroup
          type="user-memory"
          fileCount={0}
          isExpanded={false}
          isSelected={false}
        />,
      );

      // Empty groups should show collapsed icon
      const frame = lastFrame();
      expect(frame).toContain('User memory (~/.claude/CLAUDE.md) (0)');
      expect(frame).not.toContain('▼');
      expect(frame).toContain('▶');
    });

    test('should show count (0) for empty groups', () => {
      const { lastFrame } = render(
        <FileGroup
          type="project-settings"
          fileCount={0}
          isExpanded={false}
          isSelected={false}
        />,
      );

      // Should display (0) for empty groups
      expect(lastFrame()).toContain(
        'Project settings (.claude/settings.json) (0)',
      );
    });
  });
}
