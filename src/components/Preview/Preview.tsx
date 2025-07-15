import { open, readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { ClaudeFileInfo } from '../../_types.js';
import { isBinaryFile } from '../../_utils.js';
import { MarkdownPreview } from './MarkdownPreview.js';

// Format JSON content for better readability
const formatJsonContent = (content: string): string => {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If parsing fails, return original content
    return content;
  }
};

type PreviewProps = {
  readonly file?: ClaudeFileInfo | undefined;
};

export function Preview({ file }: PreviewProps): React.JSX.Element {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!file) {
      setContent('');
      return;
    }

    const loadFileContent = async () => {
      setIsLoading(true);
      setError('');

      try {
        const MAX_PREVIEW_SIZE = 1024 * 1024; // 1MB

        // Check if binary file
        if (await isBinaryFile(file.path)) {
          setError('Binary file cannot be previewed');
          setIsLoading(false);
          return;
        }

        // Check file size
        const stats = await stat(file.path);

        if (stats.size > MAX_PREVIEW_SIZE) {
          // Read only the first part of large files
          const buffer = Buffer.alloc(MAX_PREVIEW_SIZE);
          const fd = await open(file.path, 'r');
          await fd.read(buffer, 0, MAX_PREVIEW_SIZE, 0);
          await fd.close();
          const content = `${buffer.toString('utf-8')}\n\n... (file truncated due to size limit) ...`;
          setContent(content);
        } else {
          const content = await readFile(file.path, 'utf-8');
          setContent(content);
        }
        setIsLoading(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to read file: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [file]);

  if (!file) {
    return (
      <Box
        flexDirection="column"
        height="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Text dimColor>Select a file to preview</Text>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box
        flexDirection="column"
        height="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Text>Loading {basename(file.path)}...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" height="100%" padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  const fileName = basename(file.path);

  // Split content by lines
  const lines = content.split('\n');
  const totalLines = lines.length;
  const maxPreviewLines = 12; // Limit to 12 lines considering header space
  const isContentTruncated = totalLines > maxPreviewLines;
  const previewLines = isContentTruncated
    ? lines.slice(0, maxPreviewLines)
    : lines;
  const previewContent = previewLines.join('\n');

  return (
    <Box flexDirection="column" height="100%">
      {/* File information header */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderBottom={true}
        paddingBottom={1}
      >
        <Box flexDirection="column">
          <Text bold>{fileName}</Text>
          <Text dimColor>{file.path}</Text>
          <Text color="cyan">
            Type: {file.type} | Lines: {totalLines} | Size: {content.length}{' '}
            chars
          </Text>
        </Box>
      </Box>

      {/* Preview content */}
      <Box
        flexDirection="column"
        height={15} // Limit to 15 lines to prevent left list from being cut off
        overflow="hidden"
      >
        <Box flexDirection="column" paddingRight={1}>
          {fileName.endsWith('.md') ? (
            <MarkdownPreview content={previewContent} />
          ) : fileName.endsWith('.json') ? (
            <Text>{formatJsonContent(previewContent)}</Text>
          ) : (
            <Text>{previewContent}</Text>
          )}

          {/* Truncation indicator */}
          {isContentTruncated && (
            <Box marginTop={1}>
              <Text dimColor italic>
                ... ({totalLines - maxPreviewLines} more lines) ...
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
