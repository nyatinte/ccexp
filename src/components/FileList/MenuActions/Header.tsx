import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../../../styles/theme.js';

type HeaderProps = {
  readonly filePath: string;
};

function HeaderDisplay({ filePath }: HeaderProps): React.JSX.Element {
  // Extract last two parts of the path (parent/filename)
  const pathParts = filePath.split('/');
  const displayPath =
    pathParts.length > 1 ? pathParts.slice(-2).join('/') : filePath;

  return (
    <Box marginBottom={1} flexDirection="column">
      <Text bold color={theme.status.warning}>
        📋 Actions
      </Text>
      <Text dimColor>{displayPath}</Text>
    </Box>
  );
}

export const Header = React.memo(HeaderDisplay);
