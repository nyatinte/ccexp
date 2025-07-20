import { clamp } from 'es-toolkit/math';
import { Box } from 'ink';
import type React from 'react';

type SplitPaneProps = {
  readonly left: React.ReactNode;
  readonly right: React.ReactNode;
  readonly leftWidth?: number; // Specify left pane width as percentage (0-100)
};

export function SplitPane({
  left,
  right,
  leftWidth = 50,
}: SplitPaneProps): React.JSX.Element {
  // Validate percentage range
  const validLeftWidth = clamp(leftWidth, 0, 100);
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
