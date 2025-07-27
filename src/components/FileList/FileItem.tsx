import { homedir } from 'node:os';
import { basename, dirname } from 'node:path';
import { Badge } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { match, P } from 'ts-pattern';
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
      .with('slash-command', () => ({
        color: theme.fileTypes.slashCommand,
        label: 'COMMAND',
      }))
      .with('global-md', () => ({
        color: theme.fileTypes.globalMd,
        label: 'GLOBAL',
      }))
      .with('settings-json', () => ({
        color: theme.fileTypes.settingsJson,
        label: 'SETTINGS',
      }))
      .with('settings-local-json', () => ({
        color: theme.fileTypes.settingsLocalJson,
        label: 'LOCAL SETTINGS',
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
      .with('slash-command', () => '⚡')
      .with('global-md', () => '🧠')
      .with('settings-json', () => '⚙️')
      .with('settings-local-json', () => '🔧')
      .with('unknown', () => '📄')
      .exhaustive();
  };

  const fileName = basename(file.path).replace(/\t/g, ' ');
  const dirPath = dirname(file.path);
  const parentDir = basename(dirPath);

  const getDisplayName = (): string => {
    return match(file.type)
      .with('global-md', () => `~/.claude/${fileName}`)
      .with('slash-command', () => fileName.replace('.md', ''))
      .with(P.union('settings-json', 'settings-local-json'), () => {
        const homeDir = homedir();
        if (file.path.startsWith(homeDir)) {
          const relativePath = file.path.slice(homeDir.length);
          return `~${relativePath}`;
        }

        const parts = file.path.split('/');
        const claudeIndex = parts.lastIndexOf('.claude');
        if (claudeIndex > 0 && parts[claudeIndex - 1]) {
          return `${parts[claudeIndex - 1]}/.claude/${fileName}`;
        }
        return `${parentDir}/${fileName}`;
      })
      .otherwise(() => `${parentDir}/${fileName}`);
  };

  const displayName = getDisplayName();

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
