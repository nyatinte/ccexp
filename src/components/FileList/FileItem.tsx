import { basename, dirname } from 'node:path';
import { Badge } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { match } from 'ts-pattern';
import type { ClaudeFileInfo } from '../../_types.js';
import { theme } from '../../styles/theme.js';

type FileItemProps = {
  readonly file: ClaudeFileInfo;
  readonly isSelected: boolean;
  readonly isFocused: boolean;
};

export const FileItem = React.memo(function FileItem({
  file,
  isSelected,
  isFocused,
}: FileItemProps): React.JSX.Element {
  // File type badge color and label
  const getFileBadge = (file: ClaudeFileInfo) => {
    return match(file.type)
      .with('claude-md', () => ({
        color: theme.fileTypes.claudeMd,
        label: 'PROJECT',
      }))
      .with('claude-local-md', () => ({
        color: theme.fileTypes.claudeLocalMd,
        label: 'LOCAL',
      }))
      .with('slash-command', () => ({
        color: theme.fileTypes.slashCommand,
        label: 'COMMAND',
      }))
      .with('global-md', () => ({
        color: theme.fileTypes.globalMd,
        label: 'GLOBAL',
      }))
      .with('unknown', () => ({
        color: theme.fileTypes.unknown,
        label: 'FILE',
      }))
      .exhaustive();
  };

  // File type icon
  const getFileIcon = (file: ClaudeFileInfo): string => {
    return match(file.type)
      .with('claude-md', () => '📝')
      .with('claude-local-md', () => '🔒')
      .with('slash-command', () => '⚡')
      .with('global-md', () => '🧠')
      .with('unknown', () => '📄')
      .exhaustive();
  };

  // Get filename and parent directory
  const fileName = basename(file.path);
  const dirPath = dirname(file.path);
  const parentDir = basename(dirPath);

  // Display name (including parent directory)
  // Special handling for home directory
  const displayName =
    file.type === 'global-md'
      ? `~/.claude/${fileName}`
      : file.type === 'slash-command'
        ? fileName.replace('.md', '') // Remove .md for commands
        : `${parentDir}/${fileName}`;

  const prefix = isFocused ? '► ' : '  ';

  const fileBadge = getFileBadge(file);

  return (
    <Box justifyContent="space-between" width="100%">
      <Box>
        {isSelected ? (
          <Text
            backgroundColor={theme.selection.backgroundColor}
            color={theme.selection.color}
          >
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        ) : isFocused ? (
          <Text color={theme.ui.focus}>
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        ) : (
          <Text>
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        )}
      </Box>
      <Box>
        <Badge color={fileBadge.color}>{fileBadge.label}</Badge>
      </Box>
    </Box>
  );
});
