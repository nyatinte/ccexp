import { Box } from 'ink';
import type React from 'react';
import type { ClaudeFileInfo } from '../../../_types.js';
import { Footer } from './Footer.js';
import { Header } from './Header.js';
import { useMenu } from './hooks/useMenu.js';
import { MenuList } from './MenuList.js';
import { StatusMessage } from './StatusMessage.js';
import { ThemedConfirmInput } from './ThemedConfirmInput.js';

type MenuActionsProps = {
  readonly file: ClaudeFileInfo;
  readonly onClose: () => void;
};

export function MenuActions({
  file,
  onClose,
}: MenuActionsProps): React.JSX.Element {
  const {
    actions,
    selectedIndex,
    isExecuting,
    message,
    isConfirming,
    confirmMessage,
    handleConfirm,
    handleCancel,
  } = useMenu({
    file,
    onClose,
  });

  return (
    <Box flexDirection="column" borderStyle="single" padding={1}>
      <Header filePath={file.path} />
      <StatusMessage isExecuting={isExecuting} message={message} />
      {isConfirming ? (
        <ThemedConfirmInput
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : (
        <MenuList actions={actions} selectedIndex={selectedIndex} />
      )}
      <Footer />
    </Box>
  );
}
