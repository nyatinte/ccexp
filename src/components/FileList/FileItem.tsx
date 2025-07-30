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
  const getFileBadge = (
    file: ClaudeFileInfo,
  ): { color: string; label: string } => {
    return match(file.type)
      .with('project-memory', () => ({
        color: theme.fileTypes.projectMemory,
        label: 'PROJECT MEMORY',
      }))
      .with('project-memory-local', () => ({
        color: theme.fileTypes.projectMemoryLocal,
        label: 'PROJECT LOCAL',
      }))
      .with('project-subagent', () => ({
        color: theme.fileTypes.projectSubagent,
        label: 'PROJECT SUBAGENT',
      }))
      .with('user-subagent', () => ({
        color: theme.fileTypes.userSubagent,
        label: 'USER SUBAGENT',
      }))
      .with('project-command', () => ({
        color: theme.fileTypes.projectCommand,
        label: 'PROJECT COMMAND',
      }))
      .with('personal-command', () => ({
        color: theme.fileTypes.personalCommand,
        label: 'USER COMMAND',
      }))
      .with('user-memory', () => ({
        color: theme.fileTypes.userMemory,
        label: 'USER MEMORY',
      }))
      .with('project-settings', () => ({
        color: theme.fileTypes.projectSettings,
        label: 'PROJECT SETTINGS',
      }))
      .with('project-settings-local', () => ({
        color: theme.fileTypes.projectSettingsLocal,
        label: 'PROJECT LOCAL',
      }))
      .with('user-settings', () => ({
        color: theme.fileTypes.userSettings,
        label: 'USER SETTINGS',
      }))
      .with('unknown', () => ({
        color: theme.fileTypes.unknown,
        label: 'FILE',
      }))
      .exhaustive();
  };

  const getFileIcon = (file: ClaudeFileInfo): string => {
    return match(file.type)
      .with('project-memory', () => '📝')
      .with('project-memory-local', () => '🔒')
      .with('project-subagent', () => '🤖')
      .with('user-subagent', () => '🧑‍💻')
      .with('project-command', () => '⚡')
      .with('personal-command', () => '🔹')
      .with('user-memory', () => '🧠')
      .with('project-settings', () => '⚙️')
      .with('project-settings-local', () => '🔧')
      .with('user-settings', () => '🌐')
      .with('unknown', () => '📄')
      .exhaustive();
  };

  const fileName = basename(file.path).replace(/\t/g, ' ');
  const dirPath = dirname(file.path);
  const parentDir = basename(dirPath);

  const getDisplayName = (): string => {
    return match(file.type)
      .with('user-memory', () => `~/.claude/${fileName}`)
      .with(
        'user-subagent',
        () => `~/.claude/agents/${fileName.replace('.md', '')}`,
      )
      .with('project-subagent', () => fileName.replace('.md', ''))
      .with('project-command', () => {
        const commandName = fileName.replace('.md', '');
        if (parentDir !== 'commands' && parentDir !== '.') {
          return `/${parentDir}:${commandName}`;
        }
        return `/${commandName}`;
      })
      .with('personal-command', () => {
        const commandName = fileName.replace('.md', '');
        const relativePath = file.path.replace(homedir(), '~');
        return `/${commandName} (${dirname(relativePath)})`;
      })
      .with(
        P.union('project-settings', 'project-settings-local', 'user-settings'),
        () => {
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
        },
      )
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
