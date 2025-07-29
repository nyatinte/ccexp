import { StatusMessage } from '@inkjs/ui';
import { Box, Static, Text } from 'ink';
import type React from 'react';
import { useMemo } from 'react';
import type { CliOptions } from './_types.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { FileList } from './components/FileList/index.js';
import { SplitPane } from './components/Layout/index.js';
import { LoadingScreen } from './components/LoadingScreen.js';
import { Preview } from './components/Preview/index.js';
import { useFileNavigation } from './hooks/index.js';
import { theme } from './styles/theme.js';

type AppProps = {
  readonly cliOptions: CliOptions;
};

const SPLIT_PANE_WIDTH = {
  LEFT: 40,
  MIN_LEFT: 35,
  MAX_LEFT: 60,
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

  const splitPaneConfig = useMemo(() => {
    const config =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
        ? SPLIT_PANE_WIDTH_TEST
        : SPLIT_PANE_WIDTH;
    return {
      leftWidth: config.LEFT,
      minLeftWidth: config.MIN_LEFT,
      maxLeftWidth: config.MAX_LEFT,
      dynamicWidth: true,
    };
  }, []);

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
        <Text bold color={theme.status.warning}>
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
        <Static items={[{ id: 'header' }]}>
          {() => (
            <Box
              key="header"
              paddingX={1}
              paddingY={0}
              borderStyle="single"
              borderBottom={true}
            >
              <Text bold color={theme.ui.appTitle}>
                ccexp
              </Text>
              <Text dimColor> | Interactive File Browser</Text>
            </Box>
          )}
        </Static>

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
            leftWidth={splitPaneConfig.leftWidth}
            minLeftWidth={splitPaneConfig.minLeftWidth}
            maxLeftWidth={splitPaneConfig.maxLeftWidth}
            dynamicWidth={splitPaneConfig.dynamicWidth}
          />
        </Box>
      </Box>
    </ErrorBoundary>
  );
}
