import { basename, dirname, join, resolve } from 'node:path';
import clipboardy from 'clipboardy';
import { useInput } from 'ink';
import open from 'open';
import openEditor from 'open-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ClaudeFileInfo } from '../../../../_types.js';
import type { MenuAction } from '../types.js';

type UseMenuProps = {
  readonly file: ClaudeFileInfo;
  readonly onClose: () => void;
};

export const useMenu = ({ file, onClose }: UseMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<string>) | null
  >(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      await clipboardy.write(text);
    } catch (error) {
      throw new Error(`Failed to copy to clipboard: ${error}`);
    }
  }, []);

  const openFile = useCallback(async (path: string): Promise<void> => {
    try {
      await open(path);
    } catch (error) {
      throw new Error(`Failed to open file: ${error}`);
    }
  }, []);

  const editFile = useCallback(async (path: string): Promise<void> => {
    try {
      // Check if editor is configured
      const editor = process.env.EDITOR || process.env.VISUAL;
      if (!editor) {
        throw new Error(
          'No editor configured. Please set $EDITOR or $VISUAL environment variable.',
        );
      }

      await openEditor([path]);
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        // Command not found error
        if (error.message.includes('ENOENT')) {
          const editor = process.env.EDITOR || process.env.VISUAL || 'not set';
          throw new Error(
            `Editor command "${editor}" not found in PATH. ` +
              'Please ensure $EDITOR or $VISUAL is set to a valid command.',
          );
        }
        // Already our custom error
        if (error.message.includes('No editor configured')) {
          throw error;
        }
      }
      throw new Error(`Failed to edit file: ${error}`);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (pendingAction) {
      setIsExecuting(true);
      setIsConfirming(false);
      setConfirmMessage('');
      const action = pendingAction;
      setPendingAction(null);

      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }

      try {
        const successMessage = await action();
        setMessage(successMessage);
        messageTimeoutRef.current = setTimeout(() => {
          setMessage('');
          messageTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        setMessage(
          `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        messageTimeoutRef.current = setTimeout(() => {
          setMessage('');
          messageTimeoutRef.current = null;
        }, 3000);
      } finally {
        setIsExecuting(false);
      }
    }
  }, [pendingAction]);

  const handleCancel = useCallback(() => {
    setIsConfirming(false);
    setConfirmMessage('');
    setPendingAction(null);
  }, []);

  const actions: MenuAction[] = useMemo(
    () => [
      {
        key: 'c',
        label: 'Copy Content',
        description: 'Copy file content to clipboard',
        action: async () => {
          const fs = await import('node:fs/promises');
          const content = await fs.readFile(file.path, 'utf-8');
          await copyToClipboard(content);
          return '✅ Content copied to clipboard';
        },
      },
      {
        key: 'p',
        label: 'Copy Path (Absolute)',
        description: 'Copy absolute file path to clipboard',
        action: async () => {
          const absolutePath = resolve(file.path);
          await copyToClipboard(absolutePath);
          return '✅ Absolute path copied to clipboard';
        },
      },
      {
        key: 'r',
        label: 'Copy Path (Relative)',
        description: 'Copy relative file path to clipboard',
        action: async () => {
          await copyToClipboard(file.path);
          return '✅ Relative path copied to clipboard';
        },
      },
      {
        key: 'd',
        label: 'Copy to Current Directory',
        description: 'Copy file to current working directory',
        action: async () => {
          const fs = await import('node:fs/promises');
          const cwd = process.cwd();

          // Determine destination path based on file type
          let destPath: string;
          if (file.type === 'slash-command') {
            // For slash commands, preserve the directory structure under .claude/commands/
            const commandsIndex = file.path.indexOf('.claude/commands/');
            if (commandsIndex !== -1) {
              const relativePath = file.path.slice(commandsIndex);
              destPath = join(cwd, relativePath);
            } else {
              // Fallback for slash commands not in expected location
              destPath = join(cwd, '.claude', 'commands', basename(file.path));
            }
          } else {
            // For CLAUDE.md and CLAUDE.local.md, copy to current directory
            destPath = join(cwd, basename(file.path));
          }

          // Copy operation encapsulated in a function
          const performCopy = async () => {
            const destDir = dirname(destPath);
            await fs.mkdir(destDir, { recursive: true });
            await fs.copyFile(file.path, destPath);
            return `✅ Copied to ${destPath}`;
          };

          // Check if file already exists
          try {
            await fs.access(destPath);
            // File exists, need confirmation
            setConfirmMessage(
              `File "${basename(destPath)}" already exists. Overwrite?`,
            );
            setIsConfirming(true);
            // The action to be executed after confirmation
            setPendingAction(() => performCopy);

            // Return early, action will be executed after confirmation
            return '';
          } catch (error) {
            // Handle specific error cases
            if (
              error &&
              typeof error === 'object' &&
              'code' in error &&
              error.code === 'ENOENT'
            ) {
              // File doesn't exist, proceed with copy immediately
              return await performCopy();
            }
            // Other errors (permissions, disk full, etc.)
            throw new Error(
              `Failed to check destination file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        },
      },
      {
        key: 'e',
        label: 'Edit File',
        description: 'Edit file with $EDITOR',
        action: async () => {
          await editFile(file.path);
          return '✅ File opened in editor';
        },
      },
      {
        key: 'o',
        label: 'Open File',
        description: 'Open file with default application',
        action: async () => {
          await openFile(file.path);
          return '✅ File opened';
        },
      },
    ],
    [file.path, file.type, copyToClipboard, openFile, editFile],
  );

  const executeAction = useCallback(
    async (action: MenuAction): Promise<void> => {
      setIsExecuting(true);

      try {
        const successMessage = await action.action();
        setMessage(successMessage);

        // Clear any existing message timeout
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }

        messageTimeoutRef.current = setTimeout(() => {
          setMessage('');
          messageTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        setMessage(
          `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        // Clear any existing message timeout
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }

        messageTimeoutRef.current = setTimeout(() => {
          setMessage('');
          messageTimeoutRef.current = null;
        }, 3000);
      } finally {
        setIsExecuting(false);
      }
    },
    [],
  );

  useInput(
    async (input, key) => {
      if (isExecuting || isConfirming) return;

      if (key.escape) {
        onClose();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(actions.length - 1, prev + 1));
      } else if (key.return) {
        const action = actions[selectedIndex];
        if (action) {
          await executeAction(action);
        }
      } else if (input) {
        const action = actions.find(
          (a) => a.key.toLowerCase() === input.toLowerCase(),
        );
        if (action) {
          await executeAction(action);
        }
      }
    },
    { isActive: !isConfirming },
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  return {
    actions,
    selectedIndex,
    isExecuting,
    message,
    isConfirming,
    confirmMessage,
    handleConfirm,
    handleCancel,
  };
};
