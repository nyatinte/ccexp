import {
  type ComponentTheme,
  ConfirmInput,
  defaultTheme,
  extendTheme,
  ThemeProvider,
} from '@inkjs/ui';
import { Box, Text, type TextProps } from 'ink';
import type React from 'react';
import { theme } from '../../../styles/theme.js';

const confirmInputTheme = {
  styles: {
    input: (): TextProps => ({
      color: theme.status.info,
    }),
    prefix: (): TextProps => ({
      color: theme.status.warning,
    }),
  },
} satisfies ComponentTheme;

const customTheme = extendTheme(defaultTheme, {
  components: {
    ConfirmInput: confirmInputTheme,
  },
});

type ThemedConfirmInputProps = {
  readonly message: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export function ThemedConfirmInput({
  message,
  onConfirm,
  onCancel,
}: ThemedConfirmInputProps): React.JSX.Element {
  return (
    <ThemeProvider theme={customTheme}>
      <Box flexDirection="column" gap={1}>
        <Text bold>{message}</Text>
        <Box>
          <Text bold>Press </Text>
          <Text bold color={theme.status.success}>
            Y
          </Text>
          <Text bold> to confirm or </Text>
          <Text bold color={theme.status.error}>
            n
          </Text>
          <Text bold> to cancel: </Text>
        </Box>
        <ConfirmInput
          defaultChoice="cancel"
          submitOnEnter={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </Box>
    </ThemeProvider>
  );
}
