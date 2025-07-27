import { basename } from 'node:path';
import type { ClaudeFileInfo, FileGroup, FlatItem } from '../../_types.js';

/**
 * Filter file groups based on search query
 */
export const filterFileGroups = (
  fileGroups: FileGroup[],
  searchQuery: string,
): FileGroup[] => {
  if (!searchQuery) return [...fileGroups];

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
};

/**
 * Flatten hierarchical file groups into a linear array
 */
export const flattenFileGroups = (filteredGroups: FileGroup[]): FlatItem[] => {
  return filteredGroups.flatMap((group, groupIndex) => [
    { type: 'group' as const, groupIndex },
    ...(group.isExpanded
      ? group.files.map((_, fileIndex) => ({
          type: 'file' as const,
          groupIndex,
          fileIndex,
        }))
      : []),
  ]);
};

/**
 * Navigation position information
 */
type NavigationPosition = {
  type: 'group' | 'file';
  isFirstInGroup: boolean;
  hasFileAbove: boolean;
  hasPrevGroup: boolean;
  hasNextGroup: boolean;
  prevGroup: {
    index: number;
    isExpanded: boolean;
    files: ClaudeFileInfo[];
  } | null;
  nextGroup: {
    index: number;
    isExpanded: boolean;
    files: ClaudeFileInfo[];
  } | null;
};

/**
 * Calculate current navigation position
 */
export const calculateNavigationPosition = (
  filteredGroups: FileGroup[],
  currentGroupIndex: number,
  currentFileIndex: number,
  isGroupSelected: boolean,
): NavigationPosition => {
  const isFirstInGroup = currentFileIndex === 0;
  const hasFileAbove = !isGroupSelected && currentFileIndex > 0;
  const hasPrevGroup = currentGroupIndex > 0;
  const hasNextGroup = currentGroupIndex < filteredGroups.length - 1;
  const prevGroup = hasPrevGroup ? filteredGroups[currentGroupIndex - 1] : null;
  const nextGroup = hasNextGroup ? filteredGroups[currentGroupIndex + 1] : null;

  return {
    type: isGroupSelected ? 'group' : 'file',
    isFirstInGroup,
    hasFileAbove,
    hasPrevGroup,
    hasNextGroup,
    prevGroup: prevGroup
      ? {
          index: currentGroupIndex - 1,
          isExpanded: prevGroup.isExpanded,
          files: prevGroup.files,
        }
      : null,
    nextGroup: nextGroup
      ? {
          index: currentGroupIndex + 1,
          isExpanded: nextGroup.isExpanded,
          files: nextGroup.files,
        }
      : null,
  };
};

/**
 * Result of navigation action
 */
type NavigationResult = {
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
};

/**
 * Handle up arrow navigation
 */
export const handleUpArrowNavigation = (
  position: NavigationPosition,
  currentGroupIndex: number,
  currentFileIndex: number,
): NavigationResult => {
  // File with file above - move to previous file
  if (position.type === 'file' && position.hasFileAbove) {
    return {
      currentGroupIndex,
      currentFileIndex: currentFileIndex - 1,
      isGroupSelected: false,
    };
  }

  // First file in group - move to group header
  if (position.type === 'file' && position.isFirstInGroup) {
    return {
      currentGroupIndex,
      currentFileIndex,
      isGroupSelected: true,
    };
  }

  // Group with previous group
  if (
    position.type === 'group' &&
    position.hasPrevGroup &&
    position.prevGroup
  ) {
    // Previous group is expanded with files - move to last file
    if (position.prevGroup.isExpanded && position.prevGroup.files.length > 0) {
      return {
        currentGroupIndex: position.prevGroup.index,
        currentFileIndex: position.prevGroup.files.length - 1,
        isGroupSelected: false,
      };
    }
    // Previous group is collapsed or empty - move to group header
    return {
      currentGroupIndex: position.prevGroup.index,
      currentFileIndex: 0,
      isGroupSelected: true,
    };
  }

  // No change
  return {
    currentGroupIndex,
    currentFileIndex,
    isGroupSelected: position.type === 'group',
  };
};

/**
 * Handle down arrow navigation
 */
export const handleDownArrowNavigation = (
  position: NavigationPosition,
  filteredGroups: FileGroup[],
  currentGroupIndex: number,
  currentFileIndex: number,
): NavigationResult => {
  const group = filteredGroups[currentGroupIndex];

  // Group header
  if (position.type === 'group') {
    // Group is expanded with files - move to first file
    if (group?.isExpanded && group.files.length > 0) {
      return {
        currentGroupIndex,
        currentFileIndex: 0,
        isGroupSelected: false,
      };
    }
    // Group is collapsed or empty - move to next group
    if (position.hasNextGroup) {
      return {
        currentGroupIndex: currentGroupIndex + 1,
        currentFileIndex: 0,
        isGroupSelected: true,
      };
    }
  }

  // File
  if (position.type === 'file') {
    // Not last file in group - move to next file
    if (group && currentFileIndex < group.files.length - 1) {
      return {
        currentGroupIndex,
        currentFileIndex: currentFileIndex + 1,
        isGroupSelected: false,
      };
    }
    // Last file in group - move to next group
    if (position.hasNextGroup) {
      return {
        currentGroupIndex: currentGroupIndex + 1,
        currentFileIndex: 0,
        isGroupSelected: true,
      };
    }
  }

  // No change
  return {
    currentGroupIndex,
    currentFileIndex,
    isGroupSelected: position.type === 'group',
  };
};

/**
 * Get current file based on navigation state
 */
export const getFileAtPosition = (
  filteredGroups: FileGroup[],
  currentGroupIndex: number,
  currentFileIndex: number,
  isGroupSelected: boolean,
): ClaudeFileInfo | null => {
  if (isGroupSelected || filteredGroups.length === 0) return null;
  const group = filteredGroups[currentGroupIndex];
  if (!group || !group.isExpanded || group.files.length === 0) return null;
  return group.files[currentFileIndex] ?? null;
};

// InSource tests
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;

  const mockFile = (path: string): ClaudeFileInfo => ({
    path,
    type: 'claude-md',
    size: 100,
    lastModified: new Date(),
    commands: [],
    tags: [],
  });

  const mockGroup = (
    type: 'claude-md' | 'slash-command',
    files: ClaudeFileInfo[],
    isExpanded = true,
  ): FileGroup => ({
    type,
    files,
    isExpanded,
  });

  describe('filterFileGroups', () => {
    test('returns all groups when searchQuery is empty', () => {
      const groups = [
        mockGroup('claude-md', [mockFile('/project/CLAUDE.md')]),
        mockGroup('slash-command', [mockFile('/commands/test.md')]),
      ];
      const result = filterFileGroups(groups, '');
      expect(result).toEqual(groups);
    });

    test('filters files by filename', () => {
      const groups = [
        mockGroup('claude-md', [
          mockFile('/project/CLAUDE.md'),
          mockFile('/other/README.md'),
        ]),
      ];
      const result = filterFileGroups(groups, 'CLAUDE');
      expect(result[0]?.files).toHaveLength(1);
      expect(result[0]?.files[0]?.path).toBe('/project/CLAUDE.md');
    });

    test('filters files by path', () => {
      const groups = [
        mockGroup('claude-md', [
          mockFile('/project/CLAUDE.md'),
          mockFile('/other/CLAUDE.md'),
        ]),
      ];
      const result = filterFileGroups(groups, 'project');
      expect(result[0]?.files).toHaveLength(1);
      expect(result[0]?.files[0]?.path).toBe('/project/CLAUDE.md');
    });

    test('removes empty groups', () => {
      const groups = [
        mockGroup('claude-md', [mockFile('/project/CLAUDE.md')]),
        mockGroup('slash-command', [mockFile('/commands/test.md')]),
      ];
      const result = filterFileGroups(groups, 'nonexistent');
      expect(result).toHaveLength(0);
    });

    test('is case insensitive', () => {
      const groups = [mockGroup('claude-md', [mockFile('/project/CLAUDE.md')])];
      const result = filterFileGroups(groups, 'claude');
      expect(result[0]?.files).toHaveLength(1);
    });
  });

  describe('flattenFileGroups', () => {
    test('creates group and file items for expanded groups', () => {
      const groups = [
        mockGroup(
          'claude-md',
          [mockFile('/file1.md'), mockFile('/file2.md')],
          true,
        ),
      ];
      const result = flattenFileGroups(groups);
      expect(result).toEqual([
        { type: 'group', groupIndex: 0 },
        { type: 'file', groupIndex: 0, fileIndex: 0 },
        { type: 'file', groupIndex: 0, fileIndex: 1 },
      ]);
    });

    test('creates only group items for collapsed groups', () => {
      const groups = [
        mockGroup(
          'claude-md',
          [mockFile('/file1.md'), mockFile('/file2.md')],
          false,
        ),
      ];
      const result = flattenFileGroups(groups);
      expect(result).toEqual([{ type: 'group', groupIndex: 0 }]);
    });

    test('handles multiple groups', () => {
      const groups = [
        mockGroup('claude-md', [mockFile('/file1.md')], true),
        mockGroup('slash-command', [mockFile('/cmd.md')], false),
      ];
      const result = flattenFileGroups(groups);
      expect(result).toEqual([
        { type: 'group', groupIndex: 0 },
        { type: 'file', groupIndex: 0, fileIndex: 0 },
        { type: 'group', groupIndex: 1 },
      ]);
    });
  });

  describe('calculateNavigationPosition', () => {
    test('identifies group position', () => {
      const groups = [mockGroup('claude-md', [mockFile('/file1.md')])];
      const position = calculateNavigationPosition(groups, 0, 0, true);
      expect(position.type).toBe('group');
    });

    test('identifies file position', () => {
      const groups = [mockGroup('claude-md', [mockFile('/file1.md')])];
      const position = calculateNavigationPosition(groups, 0, 0, false);
      expect(position.type).toBe('file');
    });

    test('correctly identifies navigation boundaries', () => {
      const groups = [
        mockGroup('claude-md', [mockFile('/file1.md'), mockFile('/file2.md')]),
        mockGroup('slash-command', [mockFile('/cmd.md')]),
      ];

      // First group, second file
      const position = calculateNavigationPosition(groups, 0, 1, false);
      expect(position.hasFileAbove).toBe(true);
      expect(position.isFirstInGroup).toBe(false);
      expect(position.hasPrevGroup).toBe(false);
      expect(position.hasNextGroup).toBe(true);
    });
  });

  describe('handleUpArrowNavigation', () => {
    test('moves from file to previous file', () => {
      const position: NavigationPosition = {
        type: 'file',
        isFirstInGroup: false,
        hasFileAbove: true,
        hasPrevGroup: false,
        hasNextGroup: false,
        prevGroup: null,
        nextGroup: null,
      };
      const result = handleUpArrowNavigation(position, 0, 2);
      expect(result).toEqual({
        currentGroupIndex: 0,
        currentFileIndex: 1,
        isGroupSelected: false,
      });
    });

    test('moves from first file to group header', () => {
      const position: NavigationPosition = {
        type: 'file',
        isFirstInGroup: true,
        hasFileAbove: false,
        hasPrevGroup: false,
        hasNextGroup: false,
        prevGroup: null,
        nextGroup: null,
      };
      const result = handleUpArrowNavigation(position, 0, 0);
      expect(result).toEqual({
        currentGroupIndex: 0,
        currentFileIndex: 0,
        isGroupSelected: true,
      });
    });

    test('moves from group to last file of previous expanded group', () => {
      const position: NavigationPosition = {
        type: 'group',
        isFirstInGroup: false,
        hasFileAbove: false,
        hasPrevGroup: true,
        hasNextGroup: false,
        prevGroup: {
          index: 0,
          isExpanded: true,
          files: [mockFile('/f1'), mockFile('/f2')],
        },
        nextGroup: null,
      };
      const result = handleUpArrowNavigation(position, 1, 0);
      expect(result).toEqual({
        currentGroupIndex: 0,
        currentFileIndex: 1,
        isGroupSelected: false,
      });
    });
  });

  describe('handleDownArrowNavigation', () => {
    const groups = [
      mockGroup('claude-md', [mockFile('/f1'), mockFile('/f2')], true),
      mockGroup('slash-command', [mockFile('/cmd')], true),
    ];

    test('moves from group to first file when expanded', () => {
      const position: NavigationPosition = {
        type: 'group',
        isFirstInGroup: false,
        hasFileAbove: false,
        hasPrevGroup: false,
        hasNextGroup: true,
        prevGroup: null,
        nextGroup: { index: 1, isExpanded: true, files: [] },
      };
      const result = handleDownArrowNavigation(position, groups, 0, 0);
      expect(result).toEqual({
        currentGroupIndex: 0,
        currentFileIndex: 0,
        isGroupSelected: false,
      });
    });

    test('moves from file to next file', () => {
      const position: NavigationPosition = {
        type: 'file',
        isFirstInGroup: false,
        hasFileAbove: true,
        hasPrevGroup: false,
        hasNextGroup: true,
        prevGroup: null,
        nextGroup: { index: 1, isExpanded: true, files: [] },
      };
      const result = handleDownArrowNavigation(position, groups, 0, 0);
      expect(result).toEqual({
        currentGroupIndex: 0,
        currentFileIndex: 1,
        isGroupSelected: false,
      });
    });

    test('moves from last file to next group', () => {
      const position: NavigationPosition = {
        type: 'file',
        isFirstInGroup: false,
        hasFileAbove: true,
        hasPrevGroup: false,
        hasNextGroup: true,
        prevGroup: null,
        nextGroup: { index: 1, isExpanded: true, files: [] },
      };
      const result = handleDownArrowNavigation(position, groups, 0, 1);
      expect(result).toEqual({
        currentGroupIndex: 1,
        currentFileIndex: 0,
        isGroupSelected: true,
      });
    });
  });

  describe('getFileAtPosition', () => {
    const groups = [
      mockGroup('claude-md', [mockFile('/f1'), mockFile('/f2')], true),
      mockGroup('slash-command', [], true),
    ];

    test('returns null when group is selected', () => {
      const result = getFileAtPosition(groups, 0, 0, true);
      expect(result).toBeNull();
    });

    test('returns null when no groups', () => {
      const result = getFileAtPosition([], 0, 0, false);
      expect(result).toBeNull();
    });

    test('returns null when group is collapsed', () => {
      const collapsedGroups = [
        mockGroup('claude-md', [mockFile('/f1')], false),
      ];
      const result = getFileAtPosition(collapsedGroups, 0, 0, false);
      expect(result).toBeNull();
    });

    test('returns current file when valid', () => {
      const result = getFileAtPosition(groups, 0, 1, false);
      expect(result?.path).toBe('/f2');
    });

    test('returns null when file index out of bounds', () => {
      const result = getFileAtPosition(groups, 0, 5, false);
      expect(result).toBeNull();
    });
  });
}
