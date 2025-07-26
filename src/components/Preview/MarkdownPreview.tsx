import { Box, Text } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type React from 'react';
import { theme } from '../../styles/theme.js';

type MarkdownPreviewProps = {
  readonly content: string;
};

export function MarkdownPreview({
  content,
}: MarkdownPreviewProps): React.JSX.Element {
  try {
    // @ts-expect-error - Type compatibility issue between marked-terminal v7 and marked v16
    marked.use(markedTerminal());

    const rendered = marked.parse(content);
    return (
      <Box flexDirection="column">
        <Text>{rendered}</Text>
      </Box>
    );
  } catch (_error) {
    return (
      <Box flexDirection="column">
        <Text color={theme.status.error}>Failed to render Markdown</Text>
        <Text>{content}</Text>
      </Box>
    );
  }
}
