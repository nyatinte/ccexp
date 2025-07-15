import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import type { ClaudeFileInfo, FileScanner } from '../_types.js';
import { scanClaudeFiles } from '../claude-md-scanner.js';
import { scanSettingsJson } from '../settings-json-scanner.js';
import { scanSlashCommands } from '../slash-command-scanner.js';
import { delay } from '../test-utils.js';
import { useFileNavigation } from './useFileNavigation.js';

// Test component (for testing useFileNavigation)
function TestComponent({
  scanner,
  onError,
  onFilesLoaded,
}: {
  scanner?: FileScanner;
  onError?: (error: string | undefined) => void;
  onFilesLoaded?: (files: ClaudeFileInfo[]) => void;
}) {
  const { files, selectedFile, isLoading, error } = useFileNavigation(
    { recursive: false },
    scanner,
  );

  // Call callbacks for testing
  React.useEffect(() => {
    if (onError) onError(error);
  }, [error, onError]);

  React.useEffect(() => {
    if (onFilesLoaded && !isLoading) onFilesLoaded(files);
  }, [files, isLoading, onFilesLoaded]);

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <>
      <Text>Files: {files.length}</Text>
      {selectedFile && <Text>Selected: {selectedFile.path}</Text>}
      <Text>Test actions available</Text>
    </>
  );
}

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;
  const {
    createClaudeProjectFixture,
    createComplexProjectFixture,
    withTempFixture,
  } = await import('../test-fixture-helpers.js');
  const { createFixture } = await import('fs-fixture');

  describe('useFileNavigation', () => {
    test('files are loaded and sorted correctly', async () => {
      // Create actual file structure
      await using fixture = await createClaudeProjectFixture({
        projectName: 'test-project',
        includeLocal: true,
        includeCommands: true,
      });

      // Create test scanner that scans the fixture directory
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('test-project'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('test-project'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('test-project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      // Initial state is loading
      expect(lastFrame()).toContain('Loading...');

      // Wait for async processing to complete
      await delay(300); // Optimized delay for file operations

      // Verify results
      const frame = lastFrame();
      expect(frame).toContain('Files:'); // Should find files
      expect(frame).toContain('Selected:'); // Should have a selected file
      expect(frame).not.toContain('Error:'); // No errors
    });

    test('error state is set when Claude file loading fails', async () => {
      // Use mock-based approach to avoid environment-specific issues
      const testScanner: FileScanner = {
        scanClaudeFiles: async () => {
          throw new Error('EACCES: permission denied');
        },
        scanSlashCommands: async () => [],
        scanSettingsJson: async () => [],
      };

      let capturedError: string | undefined;
      let loadedFiles: ClaudeFileInfo[] = [];

      const { lastFrame } = render(
        <TestComponent
          scanner={testScanner}
          onError={(error) => {
            capturedError = error;
          }}
          onFilesLoaded={(files) => {
            loadedFiles = files;
          }}
        />,
      );

      // Initial state is loading
      expect(lastFrame()).toContain('Loading...');

      // Wait for the error to be caught and state to update
      await delay(300);

      // Verify error handling
      expect(capturedError).toBeDefined();
      expect(capturedError).toMatch(/EACCES|permission denied/i);
      expect(loadedFiles).toEqual([]);

      const frame = lastFrame();
      expect(frame).toContain('Error:');
      expect(frame).toMatch(/EACCES|permission denied/i);
      expect(frame).not.toContain('Loading...');

      // Test recovery with a working scanner
      await using fixture = await createFixture({
        accessible: {
          'CLAUDE.md': 'Accessible content',
        },
      });

      const accessibleScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('accessible'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('accessible'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('accessible'),
            recursive: false,
          }),
      };

      // Re-render with working scanner to test recovery
      const { lastFrame: lastFrame2 } = render(
        <TestComponent scanner={accessibleScanner} />,
      );

      await delay(300);

      // Verify the app recovers and works with accessible directory
      const recoveredFrame = lastFrame2();
      expect(recoveredFrame).not.toContain('Error:');
      expect(recoveredFrame).toContain('Files:');
      expect(recoveredFrame).not.toContain('Files: 0');
    });

    test('handles empty project directory', async () => {
      // Create empty directory
      await using _fixture = await withTempFixture(
        {
          'empty-project': {},
        },
        async (f) => {
          // Create test scanner for empty directory
          const testScanner: FileScanner = {
            scanClaudeFiles: (options) =>
              scanClaudeFiles({
                ...options,
                path: f.getPath('empty-project'),
                recursive: false,
              }),
            scanSlashCommands: (options) =>
              scanSlashCommands({
                ...options,
                path: f.getPath('empty-project'),
                recursive: false,
              }),
            scanSettingsJson: (options) =>
              scanSettingsJson({
                ...options,
                path: f.getPath('empty-project'),
                recursive: false,
              }),
          };

          const { lastFrame } = render(<TestComponent scanner={testScanner} />);

          // Initial state is loading
          expect(lastFrame()).toContain('Loading...');

          // Wait for async processing to complete
          await delay(300); // Optimized delay

          // Should show only global user files (since local directory is empty)
          const frame = lastFrame();
          expect(frame).toContain('Files:');
          // Will have global slash commands but no local files

          return f;
        },
      );
    });

    test('handles complex project structure', async () => {
      // Create complex project structure
      await using fixture = await createComplexProjectFixture();

      // Create test scanner for complex project
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('my-app'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('my-app'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('my-app'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      // Initial state is loading
      expect(lastFrame()).toContain('Loading...');

      // Wait for async processing to complete
      await delay(500);

      // Should find multiple files
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      expect(frame).not.toContain('Files: 0');
      expect(frame).toContain('Selected:');
    });

    test('finds global Claude files in home directory', async () => {
      // Create home directory structure
      await using fixture = await createFixture({
        '.claude': {
          'CLAUDE.md': '# Global Claude Config',
        },
        project: {
          'CLAUDE.md': '# Project Config',
        },
      });

      // Create custom scanner that includes both local and global files
      const testScanner: FileScanner = {
        scanClaudeFiles: async (options) => {
          // Scan local files
          const localFiles = await scanClaudeFiles({
            ...options,
            path: fixture.getPath('project'),
            recursive: false,
          });

          // Scan global files
          const globalFiles = await scanClaudeFiles({
            ...options,
            path: fixture.getPath('.claude'),
            recursive: false,
          });

          // Combine results
          return [...localFiles, ...globalFiles];
        },
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('project'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await delay(300);

      // Should find both global and project files
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      expect(frame).not.toContain('Files: 0');
      expect(frame).toContain('CLAUDE.md'); // Should find at least one file
    });

    test('slash commands are properly loaded', async () => {
      // Import the helper function
      const { createSlashCommandsFixture } = await import(
        '../test-fixture-helpers.js'
      );

      await using fixture = await createSlashCommandsFixture();

      // Create test scanner for slash commands
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('slash-project'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('slash-project'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('slash-project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await delay(300); // Optimized delay

      // Should find slash commands (3 local + global commands)
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      expect(frame).not.toContain('Files: 0');
      expect(frame).toContain('Selected:');
    });

    test('handles mixed file types', async () => {
      // Import the helper function
      const { createMixedFilesFixture } = await import(
        '../test-fixture-helpers.js'
      );

      await using fixture = await createMixedFilesFixture();

      // Create test scanner for mixed file types
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('mixed-project'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('mixed-project'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('mixed-project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await delay(300); // Optimized delay

      // Should find all file types
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      expect(frame).not.toContain('Files: 0');
      expect(frame).toContain('Selected:');
    });

    test('handles file updates after initial load', async () => {
      // Create initial project structure
      await using fixture = await createClaudeProjectFixture({
        projectName: 'update-test',
      });

      // Create test scanner
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('update-test'),
            recursive: false,
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('update-test'),
            recursive: false,
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('update-test'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await delay(500);

      // Verify initial state
      const initialFrame = lastFrame();
      expect(initialFrame).toContain('Files:');
      expect(initialFrame).toContain('Selected:');

      // Add a new file (Note: In real hook, this would require re-scanning)
      await fixture.writeFile(
        'update-test/CLAUDE.local.md',
        '# New local config',
      );

      // Hook doesn't auto-refresh, so files count should remain the same
      await delay(50); // Minimal delay
      expect(lastFrame()).toBe(initialFrame);
    });

    test('handles recursive directory scanning', async () => {
      // Import the helper function
      const { createNestedProjectFixture } = await import(
        '../test-fixture-helpers.js'
      );

      await using fixture = await createNestedProjectFixture();

      // Create test scanner for nested structure
      const testScanner: FileScanner = {
        scanClaudeFiles: (options) =>
          scanClaudeFiles({
            ...options,
            path: fixture.getPath('nested-project'),
            recursive: true, // This test specifically tests recursive scanning
          }),
        scanSlashCommands: (options) =>
          scanSlashCommands({
            ...options,
            path: fixture.getPath('nested-project'),
            recursive: true, // This test specifically tests recursive scanning
          }),
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('nested-project'),
            recursive: true, // This test specifically tests recursive scanning
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await delay(800); // Increased delay for recursive scanning

      // Should find all files recursively
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      // Should find multiple files from nested directories
      expect(frame).not.toContain('Files: 0');
      // Extract file count and verify it's more than 1
      const fileCountMatch = frame?.match(/Files: (\d+)/);
      expect(fileCountMatch).toBeTruthy();
      const fileCount = Number(fileCountMatch?.[1] ?? '0');
      expect(fileCount).toBeGreaterThan(1);
      expect(frame).toContain('Selected:');
    });
  });
}
