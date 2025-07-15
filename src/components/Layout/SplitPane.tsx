import { Box } from 'ink';
import type React from 'react';

type SplitPaneProps = {
  readonly left: React.ReactNode;
  readonly right: React.ReactNode;
  readonly leftWidth?: number;
  readonly minLeftWidth?: number;
  readonly maxLeftWidth?: number;
  readonly dynamicWidth?: boolean;
};

export function SplitPane({
  left,
  right,
  leftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  dynamicWidth = false,
}: SplitPaneProps): React.JSX.Element {
  let adjustedLeftWidth = leftWidth;

  if (dynamicWidth) {
    adjustedLeftWidth = Math.max(
      minLeftWidth,
      Math.min(maxLeftWidth, leftWidth),
    );
  }

  const validLeftWidth = Math.max(0, Math.min(100, adjustedLeftWidth));
  const rightWidth = 100 - validLeftWidth;

  return (
    <Box flexDirection="row" width="100%" height="100%">
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

      <Box width={`${rightWidth}%`} height="100%" paddingX={1}>
        {right}
      </Box>
    </Box>
  );
}
