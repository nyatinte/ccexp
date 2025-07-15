import { homedir } from 'node:os';
import { basename, dirname } from 'node:path';
import { Badge } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { match } from 'ts-pattern';
import type { ClaudeFileInfo } from '../../_types.js';

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
      .with('claude-md', () => ({ color: 'blue' as const, label: 'PROJECT' }))
      .with('claude-local-md', () => ({
        color: 'yellow' as const,
        label: 'LOCAL',
      }))
      .with('slash-command', () => ({
        color: 'green' as const,
        label: 'COMMAND',
      }))
      .with('global-md', () => ({ color: 'magenta' as const, label: 'GLOBAL' }))
      .with('settings-json', () => ({
        color: 'cyan' as const,
        label: 'SETTINGS',
      }))
      .with('settings-local-json', () => ({
        color: 'yellowBright' as const,
        label: 'LOCAL SETTINGS',
      }))
      .with('unknown', () => ({ color: 'gray' as const, label: 'FILE' }))
      .exhaustive();
  };

  // File type icon
  const getFileIcon = (file: ClaudeFileInfo): string => {
    return match(file.type)
      .with('claude-md', () => '📝')
      .with('claude-local-md', () => '🔒')
      .with('slash-command', () => '⚡')
      .with('global-md', () => '🌐')
      .with('settings-json', () => '⚙️')
      .with('settings-local-json', () => '🔧')
      .with('unknown', () => '📄')
      .exhaustive();
  };

  // Get filename and parent directory
  const fileName = basename(file.path);
  const dirPath = dirname(file.path);
  const parentDir = basename(dirPath);

  // Display name (including parent directory)
  // Special handling for home directory and settings files
  const getDisplayName = (): string => {
    if (file.type === 'global-md') {
      return `~/.claude/${fileName}`;
    }
    if (file.type === 'slash-command') {
      return fileName.replace('.md', ''); // Remove .md for commands
    }
    if (file.type === 'settings-json' || file.type === 'settings-local-json') {
      // Check if this is a global settings file in home directory
      const homeDir = homedir();
      if (file.path.startsWith(homeDir)) {
        const relativePath = file.path.slice(homeDir.length);
        return `~${relativePath}`;
      }

      // For project settings files, show 3 levels: grandparent/parent/filename
      const parts = file.path.split('/');
      const claudeIndex = parts.lastIndexOf('.claude');
      if (claudeIndex > 0 && parts[claudeIndex - 1]) {
        // Show: project-name/.claude/settings.json
        return `${parts[claudeIndex - 1]}/.claude/${fileName}`;
      }
      return `${parentDir}/${fileName}`;
    }
    return `${parentDir}/${fileName}`;
  };

  const displayName = getDisplayName();

  const prefix = isFocused ? '► ' : '  ';

  const fileBadge = getFileBadge(file);

  return (
    <Box justifyContent="space-between" width="100%">
      <Box>
        {isSelected ? (
          <Text backgroundColor="blue" color="white">
            {prefix}
            {getFileIcon(file)} {displayName}
          </Text>
        ) : isFocused ? (
          <Text color="white">
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
