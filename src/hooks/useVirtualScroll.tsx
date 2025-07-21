import { useStdout } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FlatItem } from '../_types.js';

interface UseVirtualScrollOptions {
  items: FlatItem[];
  currentGroupIndex: number;
  currentFileIndex: number;
  isGroupSelected: boolean;
  reservedLines: number;
}

interface UseVirtualScrollReturn {
  scrollOffset: number;
  viewportHeight: number;
  viewStart: number;
  viewEnd: number;
  visibleItems: FlatItem[];
  hasTopIndicator: boolean;
  hasBottomIndicator: boolean;
  totalLines: number;
}

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
      return 100; // Large viewport for test environment
    }

    const calculatedHeight = Math.max(
      5, // MIN_VIEWPORT_HEIGHT
      (stdout?.rows ?? 24) - reservedLines, // DEFAULT_TERMINAL_ROWS = 24
    );
    return Math.min(calculatedHeight, 20); // MAX_VIEWPORT_HEIGHT = 20
  }, [stdout.rows, reservedLines]);

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
