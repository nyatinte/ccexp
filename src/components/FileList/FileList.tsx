import { Box, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  ClaudeFileInfo,
  ClaudeFileType,
  FileGroup,
} from '../../_types.js';
import { useVirtualScroll } from '../../hooks/index.js';
import { theme } from '../../styles/theme.js';
import { FileGroup as FileGroupComponent } from './FileGroup.js';
import { FileItem } from './FileItem.js';
import { MenuActions } from './MenuActions/index.js';
import {
  calculateNavigationPosition,
  filterFileGroups,
  flattenFileGroups,
  getFileAtPosition,
  handleDownArrowNavigation,
  handleUpArrowNavigation,
} from './navigation-utils.js';

/**
 * Why not use @inkjs/ui TextInput:
 * - TextInput takes exclusive focus, blocking arrow key navigation
 * - Requires explicit mode switching (enter/exit search mode)
 * - Our implementation allows instant "type to search" while navigating
 */

// UI chrome: search(3) + scrollbars(2) + status(2) + padding(2) = 9 lines
const RESERVED_LINES = 9;

type FileListProps = {
  readonly files: ClaudeFileInfo[];
  readonly fileGroups: FileGroup[];
  readonly onFileSelect: (file: ClaudeFileInfo) => void;
  readonly onToggleGroup: (type: ClaudeFileType) => void;
  readonly selectedFile?: ClaudeFileInfo | undefined;
  readonly initialSearchQuery?: string | undefined;
  readonly onSearchQueryChange?: (query: string) => void;
  readonly testViewportHeight?: number | undefined;
};

const FileList = React.memo(function FileList({
  files,
  fileGroups,
  onFileSelect,
  onToggleGroup,
  selectedFile: _selectedFile,
  initialSearchQuery = '',
  onSearchQueryChange,
  testViewportHeight,
}: FileListProps): React.JSX.Element {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isMenuMode, setIsMenuMode] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);

  const filteredGroups = useMemo(
    () => filterFileGroups(fileGroups, searchQuery),
    [fileGroups, searchQuery],
  );

  const flatItems = useMemo(
    () => flattenFileGroups(filteredGroups),
    [filteredGroups],
  );

  const {
    scrollOffset,
    viewportHeight,
    visibleItems,
    hasTopIndicator,
    hasBottomIndicator,
    totalLines,
  } = useVirtualScroll({
    items: flatItems,
    currentGroupIndex,
    currentFileIndex,
    isGroupSelected,
    reservedLines: RESERVED_LINES,
    ...(testViewportHeight !== undefined && { testViewportHeight }),
  });

  const getCurrentFile = () =>
    getFileAtPosition(
      filteredGroups,
      currentGroupIndex,
      currentFileIndex,
      isGroupSelected,
    );

  const handleUpArrow = () => {
    const currentPosition = calculateNavigationPosition(
      filteredGroups,
      currentGroupIndex,
      currentFileIndex,
      isGroupSelected,
    );
    const result = handleUpArrowNavigation(
      currentPosition,
      currentGroupIndex,
      currentFileIndex,
    );
    setCurrentGroupIndex(result.currentGroupIndex);
    setCurrentFileIndex(result.currentFileIndex);
    setIsGroupSelected(result.isGroupSelected);
  };

  const handleDownArrow = () => {
    const currentPosition = calculateNavigationPosition(
      filteredGroups,
      currentGroupIndex,
      currentFileIndex,
      isGroupSelected,
    );
    const result = handleDownArrowNavigation(
      currentPosition,
      filteredGroups,
      currentGroupIndex,
      currentFileIndex,
    );
    setCurrentGroupIndex(result.currentGroupIndex);
    setCurrentFileIndex(result.currentFileIndex);
    setIsGroupSelected(result.isGroupSelected);
  };

  useEffect(() => {
    if (filteredGroups.length > 0) {
      if (currentGroupIndex >= filteredGroups.length) {
        setCurrentGroupIndex(0);
      }
      const group = filteredGroups[currentGroupIndex];
      if (group?.isExpanded && currentFileIndex >= group.files.length) {
        setCurrentFileIndex(0);
      }
    }
  }, [filteredGroups, currentGroupIndex, currentFileIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to detect searchQuery changes to reset indices
  useEffect(() => {
    setCurrentGroupIndex(0);
    setCurrentFileIndex(0);
    setIsGroupSelected(false);
  }, [searchQuery]);

  useEffect(() => {
    if (isGroupSelected || filteredGroups.length === 0) return;
    const group = filteredGroups[currentGroupIndex];
    if (!group || !group.isExpanded || group.files.length === 0) return;
    const currentFile = group.files[currentFileIndex];
    if (currentFile) {
      onFileSelect(currentFile);
    }
  }, [
    currentGroupIndex,
    currentFileIndex,
    filteredGroups,
    isGroupSelected,
    onFileSelect,
  ]);

  useInput(
    (input, key) => {
      if (isMenuMode) return;

      if (key.escape) {
        if (searchQuery) {
          setSearchQuery('');
          onSearchQueryChange?.('');
        } else {
          process.exit(0);
        }
        return;
      }

      if ((key.backspace || key.delete) && searchQuery) {
        setSearchQuery(searchQuery.slice(0, -1));
        onSearchQueryChange?.(searchQuery.slice(0, -1));
        return;
      }

      if (key.ctrl && input === 'h' && searchQuery) {
        setSearchQuery(searchQuery.slice(0, -1));
        onSearchQueryChange?.(searchQuery.slice(0, -1));
        return;
      }

      if (key.ctrl && input === 'u' && searchQuery) {
        setSearchQuery('');
        onSearchQueryChange?.('');
        return;
      }

      if (key.upArrow) {
        handleUpArrow();
      } else if (key.downArrow) {
        handleDownArrow();
      } else if (key.return || input === ' ') {
        if (isGroupSelected) {
          const group = filteredGroups[currentGroupIndex];
          if (group) {
            onToggleGroup(group.type);
          }
        } else {
          const currentFile = getCurrentFile();
          if (currentFile) {
            setIsMenuMode(true);
          }
        }
      }

      if (
        input &&
        input !== ' ' &&
        !key.return &&
        !key.upArrow &&
        !key.downArrow &&
        !key.escape
      ) {
        setSearchQuery(searchQuery + input);
        onSearchQueryChange?.(searchQuery + input);
      }
    },
    { isActive: !isMenuMode },
  );

  const showTopIndicator = !isMenuMode && hasTopIndicator;
  const showBottomIndicator = !isMenuMode && hasBottomIndicator;

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text bold color={theme.ui.sectionTitle}>
          Claude Files (
          {isMenuMode
            ? files.length
            : filteredGroups.reduce((acc, g) => acc + g.files.length, 0)}
          )
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          {searchQuery ? <>Search: {searchQuery}</> : 'Type to search...'}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {showTopIndicator && (
          <Box justifyContent="center" height={1}>
            <Text dimColor>▲ {scrollOffset} more above</Text>
          </Box>
        )}

        <Box
          flexDirection="column"
          height={
            isMenuMode
              ? 0
              : viewportHeight -
                (showTopIndicator ? 1 : 0) -
                (showBottomIndicator ? 1 : 0)
          }
          overflow="hidden"
        >
          {!isMenuMode &&
            visibleItems.map((item) => {
              if (item.type === 'group') {
                const group = filteredGroups[item.groupIndex];
                if (!group) return null;
                return (
                  <Box key={`group-${item.groupIndex}`} flexDirection="column">
                    <FileGroupComponent
                      type={group.type}
                      fileCount={group.files.length}
                      isExpanded={group.isExpanded}
                      isSelected={
                        isGroupSelected && item.groupIndex === currentGroupIndex
                      }
                    />
                  </Box>
                );
              }
              const group = filteredGroups[item.groupIndex];
              if (!group) return null;
              const file = group.files[item.fileIndex];
              if (!file) return null;
              return (
                <Box
                  key={`file-${item.groupIndex}-${item.fileIndex}`}
                  paddingLeft={2}
                >
                  <FileItem
                    file={file}
                    isSelected={
                      !isGroupSelected &&
                      item.groupIndex === currentGroupIndex &&
                      item.fileIndex === currentFileIndex
                    }
                    isFocused={
                      !isGroupSelected &&
                      item.groupIndex === currentGroupIndex &&
                      item.fileIndex === currentFileIndex &&
                      !isMenuMode
                    }
                  />
                </Box>
              );
            })}
        </Box>

        {showBottomIndicator && (
          <Box justifyContent="center" height={1}>
            <Text dimColor>
              ▼ {totalLines - scrollOffset - viewportHeight} more below
            </Text>
          </Box>
        )}
      </Box>

      {isMenuMode &&
        (() => {
          const currentFile = getCurrentFile();
          return currentFile ? (
            <Box flexGrow={1}>
              <MenuActions
                file={currentFile}
                onClose={() => setIsMenuMode(false)}
              />
            </Box>
          ) : null;
        })()}

      <Box marginTop={1} borderStyle="single" borderTop={true}>
        <Text dimColor>
          ↑↓: Navigate | Enter/Space: Select | Esc: Clear/Exit |
          Backspace/Delete: Remove char | Ctrl+U: Clear search
        </Text>
      </Box>
    </Box>
  );
});

export { FileList };
