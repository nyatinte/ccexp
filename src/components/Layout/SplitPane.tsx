import { Box } from 'ink';
import type React from 'react';

type SplitPaneProps = {
  readonly left: React.ReactNode;
  readonly right: React.ReactNode;
  readonly leftWidth?: number; // Specify left pane width as percentage (0-100)
  readonly minLeftWidth?: number; // Minimum left pane width percentage
  readonly maxLeftWidth?: number; // Maximum left pane width percentage
  readonly dynamicWidth?: boolean; // Enable dynamic width adjustment based on content
};

export function SplitPane({
  left,
  right,
  leftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  dynamicWidth = false,
}: SplitPaneProps): React.JSX.Element {
  // Apply min/max constraints
  let adjustedLeftWidth = leftWidth;

  if (dynamicWidth) {
    // For dynamic width, start with the provided width but apply constraints
    adjustedLeftWidth = Math.max(
      minLeftWidth,
      Math.min(maxLeftWidth, leftWidth),
    );
  }

  // Validate percentage range
  const validLeftWidth = Math.max(0, Math.min(100, adjustedLeftWidth));
  const rightWidth = 100 - validLeftWidth;

  return (
    <Box flexDirection="row" width="100%" height="100%">
      {/* Left pane: File list */}
      <Box
        width={`${validLeftWidth}%`}
        height="100%"
        borderStyle="single"
        borderRight={true}
        borderLeft={false}
        borderTop={false}
        borderBottom={false}
        paddingX={1}
      >
        {left}
      </Box>

      {/* Right pane: Preview */}
      <Box width={`${rightWidth}%`} height="100%" paddingX={1}>
        {right}
      </Box>
    </Box>
  );
}
