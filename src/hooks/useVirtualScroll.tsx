import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { match, P } from 'ts-pattern';
import type { FlatItem } from '../_types.js';

// Viewport height constants
const MIN_VIEWPORT_HEIGHT = 5;
const MAX_VIEWPORT_HEIGHT = 20;
const DEFAULT_TERMINAL_ROWS = 24;

type UseVirtualScrollOptions = {
  items: FlatItem[];
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
  reservedLines: number;
  testViewportHeight?: number;
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
  getAdjustedScrollOffset: (currentScrollOffset: number) => number;
};

export function useVirtualScroll({
  items,
  currentGroupIndex,
  currentFileIndex,
  isGroupSelected,
  reservedLines,
  testViewportHeight,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  const viewportHeight = useMemo(() => {
    if (testViewportHeight !== undefined) {
      return testViewportHeight;
    }

    const calculatedHeight = Math.max(
      MIN_VIEWPORT_HEIGHT,
      (stdout?.rows ?? DEFAULT_TERMINAL_ROWS) - reservedLines,
    );
    return Math.min(calculatedHeight, MAX_VIEWPORT_HEIGHT);
  }, [stdout?.rows, reservedLines, testViewportHeight]);

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

    for (const item of items) {
      const found = match(item)
        .with(
          {
            type: 'group',
            groupIndex: P.when(
              (idx) => isGroupSelected && idx === currentGroupIndex,
            ),
          },
          () => true,
        )
        .with(
          {
            type: 'file',
            groupIndex: P.when(
              (gIdx) => !isGroupSelected && gIdx === currentGroupIndex,
            ),
            fileIndex: P.when((fIdx) => fIdx === currentFileIndex),
          },
          () => true,
        )
        .otherwise(() => false);

      if (found) return position;
      position++;
    }

    return 0;
  }, [items, currentGroupIndex, currentFileIndex, isGroupSelected]);

  const getAdjustedScrollOffset = useCallback(
    (currentScrollOffset: number): number => {
      const currentLine = getCurrentLinePosition();
      const maxScroll = Math.max(0, totalLines - viewportHeight);

      if (currentLine < currentScrollOffset) {
        return Math.max(0, currentLine);
      }
      if (currentLine >= currentScrollOffset + viewportHeight) {
        return Math.min(maxScroll, currentLine - viewportHeight + 1);
      }
      return currentScrollOffset;
    },
    [viewportHeight, getCurrentLinePosition, totalLines],
  );

  useEffect(() => {
    setScrollOffset((currentScrollOffset) => {
      const adjustedOffset = getAdjustedScrollOffset(currentScrollOffset);
      return adjustedOffset;
    });
  }, [getAdjustedScrollOffset]);

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
    getAdjustedScrollOffset,
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
    testViewportHeight,
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
      ...(testViewportHeight !== undefined && { testViewportHeight }),
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

    test('should respect test viewport height parameter', () => {
      let hookResult: ReturnType<typeof useVirtualScroll> | undefined;

      render(
        <TestComponent
          items={createMockItems(50)}
          currentGroupIndex={0}
          currentFileIndex={0}
          isGroupSelected={false}
          reservedLines={5}
          testViewportHeight={100}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );

      expect(hookResult?.viewportHeight).toBe(100);
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
