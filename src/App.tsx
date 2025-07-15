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

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <StatusMessage variant="error">Error: {error}</StatusMessage>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // When no files found
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

  // Main UI
  return (
    <ErrorBoundary>
      <Box flexDirection="column" width="100%" height="100%">
        {/* Header */}
        <Box paddingX={1} paddingY={0} borderStyle="single" borderBottom={true}>
          <Text bold color="blue">
            ccexp
          </Text>
          <Text dimColor> | Interactive File Browser</Text>
        </Box>

        {/* Main content */}
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
            leftWidth={40} // 40% : 60% ratio
          />
        </Box>
      </Box>
    </ErrorBoundary>
  );
}
