import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary.js';

// Test component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <Text>No error</Text>;
}

// Test component that throws an error in useEffect
function ThrowErrorInEffect() {
  React.useEffect(() => {
    throw new Error('Effect error');
  }, []);
  return <Text>Loading...</Text>;
}

if (import.meta.vitest) {
  const { describe, test, expect, vi, beforeEach } = import.meta.vitest;

  describe('ErrorBoundary', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Suppress console.error during tests
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('displays children when no error occurs', () => {
      const { lastFrame } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('No error');
      expect(output).not.toContain('Error:');
    });

    test('displays error message when error is thrown', () => {
      const { lastFrame } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('displays custom error object', () => {
      const CustomError = () => {
        const error = new Error('Custom error with details');
        // @ts-ignore - Adding custom property for testing
        error.code = 'CUSTOM_ERROR';
        throw error;
      };

      const { lastFrame } = render(
        <ErrorBoundary>
          <CustomError />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Custom error with details');
    });

    test('handles errors thrown in useEffect', () => {
      const { lastFrame } = render(
        <ErrorBoundary>
          <ThrowErrorInEffect />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Effect error');
    });

    test('handles non-Error objects being thrown', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      const { lastFrame } = render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('String error');
    });

    test('handles null/undefined errors gracefully', () => {
      const ThrowNull = () => {
        throw null;
      };

      const { lastFrame } = render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Unknown error');
    });

    test('multiple error boundaries isolate errors', () => {
      const App = () => (
        <>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        </>
      );

      const { lastFrame } = render(<App />);

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Test error message');
      expect(output).toContain('No error');
    });

    test('error boundary does not reset when children change', () => {
      const { lastFrame, rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      );

      // First render shows error
      expect(lastFrame()).toContain('Test error message');

      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      // Error state persists (ErrorBoundary doesn't reset automatically)
      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Test error message');
    });

    test('error formatting handles various error types', () => {
      // Test with error that has stack trace
      const ErrorWithStack = () => {
        const error = new Error('Stack trace error');
        error.stack =
          'Error: Stack trace error\n    at ErrorWithStack (test.tsx:1:1)';
        throw error;
      };

      const { lastFrame } = render(
        <ErrorBoundary>
          <ErrorWithStack />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Stack trace error');
    });

    test('deeply nested component errors bubble up', () => {
      const DeepChild = () => {
        throw new Error('Deep error');
      };

      const MiddleChild = () => <DeepChild />;
      const ParentComponent = () => <MiddleChild />;

      const { lastFrame } = render(
        <ErrorBoundary>
          <ParentComponent />
        </ErrorBoundary>,
      );

      const output = lastFrame();
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Deep error');
    });
  });
}
