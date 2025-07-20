import { basename } from 'node:path';
import { Box, Text, useInput } from 'ink';
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

  // Filtered groups after search (memoized)
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

  // Get currently selected file
  const getCurrentFile = () => {
    if (isGroupSelected || filteredGroups.length === 0) return null;
    const group = filteredGroups[currentGroupIndex];
    if (!group || !group.isExpanded || group.files.length === 0) return null;
    return group.files[currentFileIndex];
  };

  // Adjust indices when group list changes
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

  // Reset indices when search query changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to detect searchQuery changes to reset indices
  useEffect(() => {
    setCurrentGroupIndex(0);
    setCurrentFileIndex(0);
    setIsGroupSelected(false);
  }, [searchQuery]);

  // Update file selection when selection state changes
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

  // Keyboard input handling
  useInput(
    (input, key) => {
      if (isMenuMode) return;

      // Debug: Log key events
      if (process.env.NODE_ENV === 'development') {
        console.log('Key event:', { input, key, searchQuery });
      }

      // Handle special keys
      if (key.escape) {
        if (searchQuery) {
          // Clear search if active
          setSearchQuery('');
          onSearchQueryChange?.('');
        } else {
          // Exit if no search
          process.exit(0);
        }
        return;
      }

      // Clear search on backspace or delete
      if ((key.backspace || key.delete) && searchQuery) {
        setSearchQuery(searchQuery.slice(0, -1));
        onSearchQueryChange?.(searchQuery.slice(0, -1));
        return;
      }

      // Ctrl+H as alternative backspace (common in terminal apps)
      if (key.ctrl && input === 'h' && searchQuery) {
        setSearchQuery(searchQuery.slice(0, -1));
        onSearchQueryChange?.(searchQuery.slice(0, -1));
        return;
      }

      // Ctrl+U to clear entire search query
      if (key.ctrl && input === 'u' && searchQuery) {
        setSearchQuery('');
        onSearchQueryChange?.('');
        return;
      }

      // Navigation keys
      if (key.upArrow) {
        if (isGroupSelected) {
          // Group navigation
          setCurrentGroupIndex((prev) => Math.max(0, prev - 1));
        } else {
          // File navigation
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && currentFileIndex > 0) {
            setCurrentFileIndex((prev) => prev - 1);
          } else if (currentGroupIndex > 0) {
            // Move to previous group
            const prevGroupIndex = currentGroupIndex - 1;
            const prevGroup = filteredGroups[prevGroupIndex];
            if (prevGroup?.isExpanded && prevGroup.files.length > 0) {
              setCurrentGroupIndex(prevGroupIndex);
              setCurrentFileIndex(prevGroup.files.length - 1);
            } else {
              // Select group
              setCurrentGroupIndex(prevGroupIndex);
              setIsGroupSelected(true);
            }
          } else {
            // Select first group
            setIsGroupSelected(true);
          }
        }
      } else if (key.downArrow) {
        if (isGroupSelected) {
          // From group to file
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && group.files.length > 0) {
            setIsGroupSelected(false);
            setCurrentFileIndex(0);
          } else if (currentGroupIndex < filteredGroups.length - 1) {
            setCurrentGroupIndex((prev) => prev + 1);
          }
        } else {
          // File navigation
          const group = filteredGroups[currentGroupIndex];
          if (group?.isExpanded && currentFileIndex < group.files.length - 1) {
            setCurrentFileIndex((prev) => prev + 1);
          } else if (currentGroupIndex < filteredGroups.length - 1) {
            // Move to next group
            setCurrentGroupIndex((prev) => prev + 1);
            setIsGroupSelected(true);
            setCurrentFileIndex(0);
          }
        }
      } else if (key.return || input === ' ') {
        if (isGroupSelected) {
          // Toggle group expand/collapse
          const group = filteredGroups[currentGroupIndex];
          if (group) {
            onToggleGroup(group.type);
          }
        } else {
          // Open file menu
          const currentFile = getCurrentFile();
          if (currentFile) {
            setIsMenuMode(true);
          }
        }
      }

      // Handle text input for search (exclude space and special characters)
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

  return (
    <Box flexDirection="column" height="100%">
      {/* Header - always visible */}
      <Box marginBottom={1}>
        <Text bold color={theme.ui.sectionTitle}>
          Claude Files (
          {isMenuMode
            ? files.length
            : filteredGroups.reduce((acc, g) => acc + g.files.length, 0)}
          )
        </Text>
      </Box>

      {/* Search display */}
      <Box marginBottom={1}>
        <Text dimColor>
          {searchQuery ? <>Search: {searchQuery}</> : 'Type to search...'}
        </Text>
      </Box>

      {/* File list - hidden in menu mode but still exists */}
      <Box
        flexDirection="column"
        flexGrow={1}
        height={isMenuMode ? 0 : undefined}
      >
        {!isMenuMode &&
          filteredGroups.map((group, groupIndex) => (
            <Box key={group.type} flexDirection="column">
              <FileGroupComponent
                type={group.type}
                fileCount={group.files.length}
                isExpanded={group.isExpanded}
                isSelected={isGroupSelected && groupIndex === currentGroupIndex}
              />
              {group.isExpanded &&
                group.files.map((file, fileIndex) => (
                  <Box key={`${file.path}-${fileIndex}`} paddingLeft={2}>
                    <FileItem
                      file={file}
                      isSelected={
                        !isGroupSelected &&
                        groupIndex === currentGroupIndex &&
                        fileIndex === currentFileIndex
                      }
                      isFocused={
                        !isGroupSelected &&
                        groupIndex === currentGroupIndex &&
                        fileIndex === currentFileIndex &&
                        !isMenuMode
                      }
                    />
                  </Box>
                ))}
            </Box>
          ))}
      </Box>

      {/* Menu actions - only visible in menu mode */}
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

      {/* Footer - always visible */}
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
