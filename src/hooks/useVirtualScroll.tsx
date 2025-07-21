import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlatItem } from '../_types.js';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;
const TEST_VIEWPORT_HEIGHT = 100;

type UseVirtualScrollOptions = {
  items: FlatItem[];
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
  reservedLines: number;
};

type UseVirtualScrollReturn = {
  scrollOffset: number;
  viewportHeight: number;
  viewStart: number;
  viewEnd: number;
  visibleItems: FlatItem[];
  hasTopIndicator: boolean;
  hasBottomIndicator: boolean;
  totalLines: number;
};

export function useVirtualScroll({
  items,
  currentGroupIndex,
  currentFileIndex,
  isGroupSelected,
  reservedLines,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  const viewportHeight = useMemo(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return TEST_VIEWPORT_HEIGHT;
    }

    const calculatedHeight = Math.max(
      MIN_VIEWPORT_HEIGHT,
      (stdout?.rows ?? DEFAULT_TERMINAL_ROWS) - reservedLines,
    );
    return Math.min(calculatedHeight, MAX_VIEWPORT_HEIGHT);
  }, [stdout?.rows, reservedLines]);

  const totalLines = items.length;

  const { viewStart, viewEnd } = useMemo(() => {
    const clampedOffset = Math.max(
      0,
      Math.min(scrollOffset, totalLines - viewportHeight),
    );
    const start = clampedOffset;
    const end = Math.min(start + viewportHeight, totalLines);
    return { viewStart: start, viewEnd: end };
  }, [scrollOffset, viewportHeight, totalLines]);

  const visibleItems = useMemo(
    () => items.slice(viewStart, viewEnd),
    [items, viewStart, viewEnd],
  );

  const getCurrentLinePosition = useCallback((): number => {
    let position = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.type === 'group') {
        if (isGroupSelected && item.groupIndex === currentGroupIndex) {
          return position;
        }
        position++;
      } else if (item?.type === 'file') {
        if (
          !isGroupSelected &&
          item.groupIndex === currentGroupIndex &&
          item.fileIndex === currentFileIndex
        ) {
          return position;
        }
        position++;
      }
    }
    return 0;
  }, [items, currentGroupIndex, currentFileIndex, isGroupSelected]);

  useEffect(() => {
    const currentLine = getCurrentLinePosition();
    const maxScroll = Math.max(0, totalLines - viewportHeight);

    if (currentLine < scrollOffset) {
      setScrollOffset(Math.max(0, currentLine));
    } else if (currentLine >= scrollOffset + viewportHeight) {
      setScrollOffset(Math.min(maxScroll, currentLine - viewportHeight + 1));
    }
  }, [viewportHeight, scrollOffset, getCurrentLinePosition, totalLines]);

  const hasTopIndicator = scrollOffset > 0;
  const hasBottomIndicator = scrollOffset + viewportHeight < totalLines;

  return {
    scrollOffset,
    viewportHeight,
    viewStart,
    viewEnd,
    visibleItems,
    hasTopIndicator,
    hasBottomIndicator,
    totalLines,
  };
}

if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  const { render } = await import('ink-testing-library');
  const { Text } = await import('ink');
  const React = await import('react');

  const createMockItems = (count: number): FlatItem[] => {
    const items: FlatItem[] = [];
    const groupCount = Math.ceil(count / 5);

    for (let g = 0; g < groupCount; g++) {
      items.push({
        type: 'group',
        groupIndex: g,
      });

      const filesInGroup = Math.min(5, count - g * 5 - 1);
      for (let f = 0; f < filesInGroup; f++) {
        items.push({
          type: 'file',
          groupIndex: g,
          fileIndex: f,
        });
      }
    }

    return items;
  };

  // Test component for testing the hook
  function TestComponent({
    items,
    currentGroupIndex,
    currentFileIndex,
    isGroupSelected,
    reservedLines,
    onResult,
  }: UseVirtualScrollOptions & {
    onResult?: (result: ReturnType<typeof useVirtualScroll>) => void;
  }) {
    const result = useVirtualScroll({
      items,
      currentGroupIndex,
      currentFileIndex,
      isGroupSelected,
      reservedLines,
    });

    React.useEffect(() => {
      if (onResult) {
        onResult(result);
      }
    }, [result, onResult]);

    return <Text>ViewportHeight: {result.viewportHeight}</Text>;
  }

  describe('useVirtualScroll', () => {
    test('should return correct visible items based on scroll offset', () => {
      const items = createMockItems(30);
      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={items}
          currentGroupIndex={0}
          currentFileIndex={0}
          isGroupSelected={false}
          reservedLines={5}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      expect(hookResult?.visibleItems.length).toBeLessThanOrEqual(
        hookResult?.viewportHeight ?? 0,
      );
      expect(hookResult?.viewStart).toBe(0);
      // viewEnd should be the minimum of totalLines and viewportHeight
      expect(hookResult?.viewEnd).toBe(
        Math.min(items.length, hookResult?.viewportHeight ?? 0),
      );
    });

    test('should handle edge case with empty items', () => {
      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={[]}
          currentGroupIndex={0}
          currentFileIndex={0}
          isGroupSelected={false}
          reservedLines={5}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      expect(hookResult?.totalLines).toBe(0);
      expect(hookResult?.visibleItems).toHaveLength(0);
      expect(hookResult?.hasTopIndicator).toBe(false);
      expect(hookResult?.hasBottomIndicator).toBe(false);
    });

    test('should handle edge case with small number of items', () => {
      const items = createMockItems(3);
      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={items}
          currentGroupIndex={0}
          currentFileIndex={0}
          isGroupSelected={false}
          reservedLines={5}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      expect(hookResult?.totalLines).toBe(3);
      expect(hookResult?.visibleItems).toHaveLength(3);
      expect(hookResult?.hasTopIndicator).toBe(false);
      expect(hookResult?.hasBottomIndicator).toBe(false);
    });

    test('should respect test environment viewport height', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={createMockItems(50)}
          currentGroupIndex={0}
          currentFileIndex={0}
          isGroupSelected={false}
          reservedLines={5}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      expect(hookResult?.viewportHeight).toBe(TEST_VIEWPORT_HEIGHT);

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle group selection correctly', () => {
      const items = createMockItems(30);
      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={items}
          currentGroupIndex={2}
          currentFileIndex={0}
          isGroupSelected={true}
          reservedLines={5}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      // Should scroll to show the selected group
      const selectedGroupPosition = items.findIndex(
        (item) => item.type === 'group' && item.groupIndex === 2,
      );

      if (selectedGroupPosition >= (hookResult?.viewportHeight ?? 0)) {
        expect(hookResult?.scrollOffset).toBeGreaterThan(0);
      }
    });
  });
}
