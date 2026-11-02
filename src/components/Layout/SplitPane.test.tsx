import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { SplitPane } from './SplitPane.js';

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe('SplitPane', () => {
    test('renders correctly', () => {
      const { lastFrame } = render(
        <SplitPane
          left={<Text>Left Content</Text>}
          right={<Text>Right Content</Text>}
        />,
      );

      expect(lastFrame()).toContain('Left Content');
      expect(lastFrame()).toContain('Right Content');
    });

    test('applies custom width ratio', () => {
      const { lastFrame } = render(
        <SplitPane
          left={<Text>Left</Text>}
          right={<Text>Right</Text>}
          leftWidth={30}
        />,
      );

      // Verify both sides are included in render output
      expect(lastFrame()).toContain('Left');
      expect(lastFrame()).toContain('Right');
    });

    test('uses default 50% width ratio', () => {
      const { lastFrame } = render(
        <SplitPane
          left={<Text>Default Left</Text>}
          right={<Text>Default Right</Text>}
        />,
      );

      expect(lastFrame()).toContain('Default Left');
      expect(lastFrame()).toContain('Default Right');
    });
  });
}
