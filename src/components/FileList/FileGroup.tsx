import { Box, Text } from 'ink';
import React from 'react';
import { match } from 'ts-pattern';
import type { ClaudeFileType } from '../../_types.js';

type FileGroupProps = {
  readonly type: ClaudeFileType;
  readonly fileCount: number;
  readonly isExpanded: boolean;
  readonly isSelected: boolean;
};

const getGroupLabel = (type: ClaudeFileType): string => {
  return match(type)
    .with('claude-md', () => 'PROJECT')
    .with('claude-local-md', () => 'LOCAL')
    .with('slash-command', () => 'COMMAND')
    .with('global-md', () => 'GLOBAL')
    .with('settings-json', () => 'SETTINGS')
    .with('settings-local-json', () => 'LOCAL SETTINGS')
    .with('unknown', () => 'OTHER')
    .exhaustive();
};

const getGroupColor = (type: ClaudeFileType): string => {
  return match(type)
    .with('claude-md', () => 'blue')
    .with('claude-local-md', () => 'yellow')
    .with('slash-command', () => 'green')
    .with('global-md', () => 'magenta')
    .with('settings-json', () => 'cyan')
    .with('settings-local-json', () => 'yellowBright')
    .with('unknown', () => 'gray')
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
        <Text backgroundColor="blue" color="white">
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
          type="claude-md"
          fileCount={5}
          isExpanded={true}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▼ PROJECT (5)');
    });

    test('should show collapsed icon when not expanded', () => {
      const { lastFrame } = render(
        <FileGroup
          type="claude-md"
          fileCount={3}
          isExpanded={false}
          isSelected={false}
        />,
      );

      expect(lastFrame()).toContain('▶ PROJECT (3)');
    });

    test('should highlight when selected', () => {
      const { lastFrame } = render(
        <FileGroup
          type="slash-command"
          fileCount={10}
          isExpanded={true}
          isSelected={true}
        />,
      );

      // Selected groups should have different styling
      expect(lastFrame()).toContain('▼ COMMAND (10)');
    });
  });
}
