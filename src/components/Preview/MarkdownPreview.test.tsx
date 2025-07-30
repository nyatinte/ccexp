import { render } from 'ink-testing-library';
import { createMockFileContent } from '../../test-fixture-helpers.js';
import { MarkdownPreview } from './MarkdownPreview.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('MarkdownPreview', () => {
    test('displays basic Markdown content', () => {
      const content = createMockFileContent('markdown');

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Test Document');
      expect(lastFrame()).toContain('Features');
    });

    test('safely displays empty content', () => {
      const content = '';

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      // Verify no rendering errors occur with empty content
      expect(lastFrame()).toBeDefined();
      expect(typeof lastFrame()).toBe('string');
    });

    test('displays Markdown with headings', () => {
      const content = `# Main Title

## Subtitle

### Sub-subtitle

Paragraph content under subtitles.`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Main Title');
      expect(lastFrame()).toContain('Subtitle');
      expect(lastFrame()).toContain('Sub-subtitle');
      expect(lastFrame()).toContain('Paragraph content under subtitles.');
    });

    test('displays Markdown with bold and italic text', () => {
      const content = `This text contains **bold text**, *italic text*, and ***bold italic text***.

Also includes \`inline code\` formatting.`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('bold text');
      expect(lastFrame()).toContain('italic text');
      expect(lastFrame()).toContain('inline code');
    });

    test('displays Markdown with lists', () => {
      const content = `## Unordered List
- Item 1
- Item 2
  - Nested item 1
  - Nested item 2
- Item 3

## Ordered List
1. First item
2. Second item
3. Third item`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Item 1');
      expect(lastFrame()).toContain('Item 2');
      expect(lastFrame()).toContain('Nested item 1');
      expect(lastFrame()).toContain('First item');
      expect(lastFrame()).toContain('Second item');
    });

    test('displays Markdown with code blocks', () => {
      const content = `## Code Examples

\`\`\`javascript
const example = "Hello World";
console.log(example);
\`\`\`

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`

\`\`\`bash
npm install
npm start
\`\`\``;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      const frame = lastFrame() ?? '';
      // Strip ANSI escape sequences for testing
      // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences contain control characters
      const cleanFrame = frame.replace(/\u001b\[[0-9;]*m/g, '');

      expect(cleanFrame).toContain('const example');
      expect(cleanFrame).toContain('interface User');
      expect(cleanFrame).toContain('npm install');
    });

    test('displays Markdown with quotes and links', () => {
      const content = `## Quotes and Links

> This is a blockquote.
> It can span multiple lines.

Here's a [link to example](https://example.com).

And an automatic link: https://github.com`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('This is a blockquote');
      expect(lastFrame()).toContain('link to example');
      expect(lastFrame()).toContain('https://github.com');
    });

    test('displays Markdown with tables', () => {
      const content = `## Table Example

| Name | Age | City |
|------|-----|------|
| Alice | 30 | New York |
| Bob | 25 | Tokyo |
| Charlie | 35 | London |`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Name');
      expect(lastFrame()).toContain('Alice');
      expect(lastFrame()).toContain('Bob');
      expect(lastFrame()).toContain('New York');
    });

    test('displays complex structured Markdown', () => {
      const content = createMockFileContent('project-memory');

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('CLAUDE.md');
      expect(lastFrame()).toContain('Project Configuration');
      expect(lastFrame()).toContain('Development Rules');
      expect(lastFrame()).toContain('TypeScript');
    });

    test('displays slash command format Markdown', () => {
      const content = createMockFileContent('project-command');

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Deploy Command');
      expect(lastFrame()).toContain('Usage');
      expect(lastFrame()).toContain('/deploy');
      expect(lastFrame()).toContain('Arguments');
    });

    test('displays Markdown with special characters', () => {
      const content = `# Title with "quotes" and <brackets> & symbols

Special characters: \`&\`, \`<\`, \`>\`, \`"\`, \`'\`

HTML entities: &amp; &lt; &gt; &quot;`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Title with');
      expect(lastFrame()).toContain('quotes');
      expect(lastFrame()).toContain('symbols');
      expect(lastFrame()).toContain('Special characters');
    });

    test('displays very long content', () => {
      const content = `# Long Document

${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)}

## Section 1
${'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. '.repeat(50)}

## Section 2  
${'Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. '.repeat(50)}`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Long Document');
      expect(lastFrame()).toContain('Section 1');
      expect(lastFrame()).toContain('Section 2');
    });

    test('preserves line breaks and spaces', () => {
      const content = `Line 1

Line 3 (with empty line above)

Line 5    (with trailing spaces)

    Line 6 (with leading spaces)`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      const frame = lastFrame() ?? '';
      // Strip ANSI escape sequences for testing
      // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences contain control characters
      const cleanFrame = frame.replace(/\u001b\[[0-9;]*m/g, '');

      expect(cleanFrame).toContain('Line 1');
      expect(cleanFrame).toContain('Line 3');
      expect(cleanFrame).toContain('Line 5');
      expect(cleanFrame).toContain('Line 6');
    });

    test('displays Markdown escape characters', () => {
      const content = `## Escaped Characters

\\*Not italic\\*
\\**Not bold\\**
\\# Not a heading
\\[Not a link\\](not-a-url)
\\\`Not code\\\``;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Escaped Characters');
      expect(lastFrame()).toContain('*Not italic*');
      expect(lastFrame()).toContain('# Not a heading');
    });

    test('displays mixed content', () => {
      const content = `# Mixed Content Document

## Code and Text
Here's some \`inline code\` mixed with **bold** and *italic* text.

\`\`\`javascript
// Code block
function example() {
  return "Hello";
}
\`\`\`

## Lists and Quotes
> Important note about the following list:

1. First item with \`code\`
2. Second item with **emphasis**
3. Third item with [link](https://example.com)

## Table with code
| Function | Description |
|----------|-------------|
| \`console.log()\` | Prints to console |
| \`alert()\` | Shows alert |`;

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toContain('Mixed Content Document');
      expect(lastFrame()).toContain('Code and Text');
      expect(lastFrame()).toContain('Important note');
      expect(lastFrame()).toContain('console.log');
    });

    test('displays content with only empty lines', () => {
      const content = '\n\n\n\n\n';

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toBeDefined();
      expect(typeof lastFrame()).toBe('string');
    });

    test('displays content with only whitespace', () => {
      const content = '   \t   \n  \t  \n   ';

      const { lastFrame } = render(<MarkdownPreview content={content} />);

      expect(lastFrame()).toBeDefined();
      expect(typeof lastFrame()).toBe('string');
    });
  });
}
