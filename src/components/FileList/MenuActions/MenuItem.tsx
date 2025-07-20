import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../../../styles/theme.js';
import type { MenuAction } from './types.js';

type MenuItemProps = {
  readonly action: MenuAction;
  readonly isSelected: boolean;
};

function MenuItemDisplay({
  action,
  isSelected,
}: MenuItemProps): React.JSX.Element {
  return (
    <Box>
      {isSelected ? (
        <Text
          backgroundColor={theme.selection.backgroundColor}
          color={theme.selection.color}
        >
          ► [{action.key.toUpperCase()}] {action.label}
        </Text>
      ) : (
        <Text>
          {'  '}[{action.key.toUpperCase()}] {action.label}
        </Text>
      )}
    </Box>
  );
}

export const MenuItem = React.memo(MenuItemDisplay);
