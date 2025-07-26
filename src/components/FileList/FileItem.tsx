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
      .with('project-agent', () => ({
        color: theme.fileTypes.slashCommand,
        label: 'PROJECT AGENT',
      }))
      .with('user-agent', () => ({
        color: theme.fileTypes.globalMd,
        label: 'USER AGENT',
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

  const getFileIcon = (file: ClaudeFileInfo): string => {
    return match(file.type)
      .with('claude-md', () => '📝')
      .with('claude-local-md', () => '🔒')
      .with('project-agent', () => '🤖')
      .with('user-agent', () => '👤')
      .with('slash-command', () => '⚡')
      .with('global-md', () => '🧠')
      .with('unknown', () => '📄')
      .exhaustive();
  };

  const fileName = basename(file.path).replace(/\t/g, ' ');
  const dirPath = dirname(file.path);
  const parentDir = basename(dirPath);

  const displayName = match(file.type)
    .with('global-md', () => `~/.claude/${fileName}`)
    .with('user-agent', () => `~/.claude/agents/${fileName.replace('.md', '')}`)
    .with('project-agent', () => fileName.replace('.md', ''))
    .with('slash-command', () => fileName.replace('.md', ''))
    .otherwise(() => `${parentDir}/${fileName}`);

  const prefix = isFocused ? '► ' : '  ';

  const fileBadge = getFileBadge(file);

  return (
    <Box justifyContent="space-between" width="100%">
      <Box flexGrow={1} marginRight={1}>
        {isSelected ? (
          <Text
            backgroundColor={theme.selection.backgroundColor}
            color={theme.selection.color}
            wrap="truncate-end"
          >
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        ) : isFocused ? (
          <Text color={theme.ui.focus} wrap="truncate-end">
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        ) : (
          <Text wrap="truncate-end">
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        )}
      </Box>
      <Box flexShrink={0}>
        <Badge color={fileBadge.color}>{fileBadge.label}</Badge>
      </Box>
    </Box>
  );
});
