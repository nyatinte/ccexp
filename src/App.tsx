import { StatusMessage } from '@inkjs/ui';
import { Box, Text } from 'ink';
import type React from 'react';
import type { CliOptions } from './_types.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { FileList } from './components/FileList/index.js';
import { SplitPane } from './components/Layout/index.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { Preview } from './components/Preview/index.js';
import { useFileNavigation } from './hooks/index.js';

type AppProps = {
  readonly cliOptions: CliOptions;
};

const SPLIT_PANE_WIDTH = {
  LEFT: 35,
  MIN_LEFT: 25,
  MAX_LEFT: 50,
} as const;

const SPLIT_PANE_WIDTH_TEST = {
  LEFT: 60,
  MIN_LEFT: 25,
  MAX_LEFT: 80,
} as const;

export function App({ cliOptions }: AppProps): React.JSX.Element {
  const {
    files,
    fileGroups,
    selectedFile,
    isLoading,
    error,
    selectFile,
    toggleGroup,
  } = useFileNavigation({ path: cliOptions.path });

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <StatusMessage variant="error">Error: {error}</StatusMessage>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (files.length === 0) {
    return (
      <Box
        flexDirection="column"
        padding={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text bold color="yellow">
          No Claude files found
        </Text>
        <Text dimColor>Create a CLAUDE.md file to get started</Text>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box flexDirection="column" width="100%" height="100%">
        <Box paddingX={1} paddingY={0} borderStyle="single" borderBottom={true}>
          <Text bold color="blue">
            ccexp
          </Text>
          <Text dimColor> | Interactive File Browser</Text>
        </Box>

        <Box flexGrow={1}>
          <SplitPane
            left={
              <ErrorBoundary>
                <FileList
                  files={files}
                  fileGroups={fileGroups}
                  selectedFile={selectedFile}
                  onFileSelect={selectFile}
                  onToggleGroup={toggleGroup}
                />
              </ErrorBoundary>
            }
            right={
              <ErrorBoundary>
                <Preview file={selectedFile} />
              </ErrorBoundary>
            }
            leftWidth={
              typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
                ? SPLIT_PANE_WIDTH_TEST.LEFT
                : SPLIT_PANE_WIDTH.LEFT
            }
            minLeftWidth={
              typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
                ? SPLIT_PANE_WIDTH_TEST.MIN_LEFT
                : SPLIT_PANE_WIDTH.MIN_LEFT
            }
            maxLeftWidth={
              typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
                ? SPLIT_PANE_WIDTH_TEST.MAX_LEFT
                : SPLIT_PANE_WIDTH.MAX_LEFT
            }
            dynamicWidth={true}
          />
        </Box>
      </Box>
    </ErrorBoundary>
  );
}
