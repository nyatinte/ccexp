import { Box, Text } from 'ink';
import React from 'react';
import type { MenuAction } from './types.js';

type MenuItemProps = {
  readonly action: MenuAction;
  readonly isSelected: boolean;
};

const MenuItemDisplay = ({ action, isSelected }: MenuItemProps) => (
  <Box>
    <Text
      {...(isSelected && {
        backgroundColor: 'cyan',
        color: 'black',
      })}
    >
      {isSelected ? '► ' : '  '}[{action.key.toUpperCase()}] {action.label}
    </Text>
  </Box>
);

export const MenuItem = React.memo(MenuItemDisplay);
