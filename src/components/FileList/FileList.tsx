import { basename } from 'node:path';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  ClaudeFileInfo,
  ClaudeFileType,
  FileGroup,
} from '../../_types.js';
import { theme } from '../../styles/theme.js';
import { FileGroup as FileGroupComponent } from './FileGroup.js';
import { FileItem } from './FileItem.js';
import { MenuActions } from './MenuActions/index.js';

/**
 * Why not use @inkjs/ui TextInput:
 * - TextInput takes exclusive focus, blocking arrow key navigation
 * - Requires explicit mode switching (enter/exit search mode)
 * - Our implementation allows instant "type to search" while navigating
 */

const RESERVED_LINES = 9; // Terminal UI components (header, borders, search bar, status messages) occupy these lines
const DEFAULT_TERMINAL_ROWS = 24; // Default terminal height if we can't detect the actual size
const MAX_VIEWPORT_HEIGHT = 20; // Maximum viewport height to ensure readability on larger terminals
const MIN_VIEWPORT_HEIGHT = 5; // Minimum viewport height to maintain usability
const TEST_VIEWPORT_HEIGHT = 100; // Large viewport for test environment to avoid scrolling issues

type FlatItem =
  | { type: 'group'; groupIndex: number }
  | { type: 'file'; groupIndex: number; fileIndex: number };

type FileListProps = {
  readonly files: ClaudeFileInfo[];
  readonly fileGroups: FileGroup[];
  readonly onFileSelect: (file: ClaudeFileInfo) => void;
  readonly onToggleGroup: (type: ClaudeFileType) => void;
  readonly selectedFile?: ClaudeFileInfo | undefined;
  readonly initialSearchQuery?: string | undefined;
  readonly onSearchQueryChange?: (query: string) => void;
};

const FileList = React.memo(function FileList({
  files,
  fileGroups,
  onFileSelect,
  onToggleGroup,
  selectedFile: _selectedFile,
  initialSearchQuery = '',
  onSearchQueryChange,
}: FileListProps): React.JSX.Element {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isMenuMode, setIsMenuMode] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return fileGroups;

    return fileGroups
      .map((group) => ({
        ...group,
        files: group.files.filter((file) => {
          const fileName = basename(file.path);
          return (
            fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            file.path.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }),
      }))
      .filter((group) => group.files.length > 0);
  }, [fileGroups, searchQuery]);

  const viewportHeight = useMemo(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return TEST_VIEWPORT_HEIGHT;
    }

    const calculatedHeight = Math.max(
      MIN_VIEWPORT_HEIGHT,
      (stdout?.rows ?? DEFAULT_TERMINAL_ROWS) - RESERVED_LINES,
    );
    return Math.min(calculatedHeight, MAX_VIEWPORT_HEIGHT);
  }, [stdout?.rows]);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];

    for (let groupIndex = 0; groupIndex < filteredGroups.length; groupIndex++) {
      const group = filteredGroups[groupIndex];
      if (!group) continue;

      items.push({ type: 'group', groupIndex });

      if (group.isExpanded) {
        for (let fileIndex = 0; fileIndex < group.files.length; fileIndex++) {
          items.push({ type: 'file', groupIndex, fileIndex });
        }
      }
    }
    return items;
  }, [filteredGroups]);

  const totalLines = useMemo(() => flatItems.length, [flatItems]);

  const getCurrentLinePosition = useMemo(() => {
    let linePos = 0;

    for (let i = 0; i < currentGroupIndex; i++) {
      const group = filteredGroups[i];
      if (group) {
        linePos += 1;
        if (group.isExpanded) {
          linePos += group.files.length;
        }
      }
    }

    if (isGroupSelected) {
      return linePos;
    }

    const currentGroup = filteredGroups[currentGroupIndex];
    if (currentGroup?.isExpanded) {
      linePos += 1;
      linePos += currentFileIndex;
    }

    return linePos;
  }, [currentGroupIndex, currentFileIndex, isGroupSelected, filteredGroups]);

  const visibleItems = useMemo(() => {
    const effectiveScrollOffset = Math.max(
      0,
      Math.min(scrollOffset, totalLines - viewportHeight),
    );

    return flatItems.slice(
      effectiveScrollOffset,
      effectiveScrollOffset + viewportHeight,
    );
  }, [flatItems, scrollOffset, viewportHeight, totalLines]);

  const getCurrentFile = () => {
    if (isGroupSelected || filteredGroups.length === 0) return null;
    const group = filteredGroups[currentGroupIndex];
    if (!group || !group.isExpanded || group.files.length === 0) return null;
    return group.files[currentFileIndex];
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
    setScrollOffset(0);
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

  useEffect(() => {
    const currentLine = getCurrentLinePosition;
    const maxScroll = Math.max(0, totalLines - viewportHeight);

    if (currentLine < scrollOffset) {
      setScrollOffset(Math.max(0, currentLine));
    } else if (currentLine >= scrollOffset + viewportHeight) {
      setScrollOffset(Math.min(maxScroll, currentLine - viewportHeight + 1));
    }
  }, [viewportHeight, scrollOffset, getCurrentLinePosition, totalLines]);

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
        if (isGroupSelected) {
          setCurrentGroupIndex((prev) => Math.max(0, prev - 1));
        } else {
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && currentFileIndex > 0) {
            setCurrentFileIndex((prev) => prev - 1);
          } else if (currentGroupIndex > 0) {
            const prevGroupIndex = currentGroupIndex - 1;
            const prevGroup = filteredGroups[prevGroupIndex];
            if (prevGroup?.isExpanded && prevGroup.files.length > 0) {
              setCurrentGroupIndex(prevGroupIndex);
              setCurrentFileIndex(prevGroup.files.length - 1);
            } else {
              setCurrentGroupIndex(prevGroupIndex);
              setIsGroupSelected(true);
            }
          } else {
            setIsGroupSelected(true);
          }
        }
      } else if (key.downArrow) {
        if (isGroupSelected) {
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && group.files.length > 0) {
            setIsGroupSelected(false);
            setCurrentFileIndex(0);
          } else if (currentGroupIndex < filteredGroups.length - 1) {
            setCurrentGroupIndex((prev) => prev + 1);
          }
        } else {
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && currentFileIndex < group.files.length - 1) {
            setCurrentFileIndex((prev) => prev + 1);
          } else if (currentGroupIndex < filteredGroups.length - 1) {
            setCurrentGroupIndex((prev) => prev + 1);
            setIsGroupSelected(true);
            setCurrentFileIndex(0);
          }
        }
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

  const hasTopIndicator = !isMenuMode && scrollOffset > 0;
  const hasBottomIndicator =
    !isMenuMode && scrollOffset + viewportHeight < totalLines;

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
        {hasTopIndicator && (
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
                (hasTopIndicator ? 1 : 0) -
                (hasBottomIndicator ? 1 : 0)
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
              if (!group || item.fileIndex == null) return null;
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

        {hasBottomIndicator && (
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
