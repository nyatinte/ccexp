import {
  type ComponentTheme,
  ConfirmInput,
  defaultTheme,
  extendTheme,
  ThemeProvider,
} from '@inkjs/ui';
import { Box, Text, type TextProps } from 'ink';
import type React from 'react';

const confirmInputTheme = {
  styles: {
    input: (): TextProps => ({
      color: 'cyan',
    }),
    prefix: (): TextProps => ({
      color: 'yellow',
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
          <Text bold color="green">
            Y
          </Text>
          <Text bold> to confirm or </Text>
          <Text bold color="red">
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
