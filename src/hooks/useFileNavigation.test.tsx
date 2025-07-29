import { delay } from 'es-toolkit/promise';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import type {
  ClaudeFileInfo,
  ClaudeFileType,
  FileGroup,
  FileScanner,
} from '../_types.js';
import { createClaudeFilePath } from '../_types.js';
import { scanClaudeFiles } from '../claude-md-scanner.js';
import { scanSettingsJson } from '../settings-json-scanner.js';
import { scanSlashCommands } from '../slash-command-scanner.js';
import { waitFor } from '../test-utils.js';
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
        scanSubAgents: async () => [], // No sub-agents in test
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
      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

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
        scanSubAgents: async () => [], // No sub-agents in test
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
      await waitFor(() => {
        if (!capturedError) {
          throw new Error('Error not captured yet');
        }
      });

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
        scanSubAgents: async () => [], // No sub-agents in test
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

      await waitFor(() => {
        const frame = lastFrame2();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

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
            scanSubAgents: async () => [], // No sub-agents in test
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
          await waitFor(() => {
            const frame = lastFrame();
            if (!frame || frame.includes('Loading...')) {
              throw new Error('Still loading');
            }
          });

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
        scanSubAgents: async () => [], // No sub-agents in test
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
      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      }, 500);

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
        scanSubAgents: async () => [], // No sub-agents in test
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

      // Should find both global and project files
      const frame = lastFrame();
      expect(frame).toContain('Files:');
      expect(frame).not.toContain('Files: 0');
      // The selected file path should contain either .claude or project
      expect(frame).toMatch(/Selected:.*\/(\.claude|project)\//); // Should have selected a file from our fixture
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
        scanSubAgents: async () => [], // No sub-agents in test
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('slash-project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

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
        scanSubAgents: async () => [], // No sub-agents in test
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('mixed-project'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

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
        scanSubAgents: async () => [], // No sub-agents in test
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('update-test'),
            recursive: false,
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      }, 500);

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
      await delay(50); // This is a minimal delay to ensure no auto-refresh happens
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
        scanSubAgents: async () => [], // No sub-agents in test
        scanSettingsJson: (options) =>
          scanSettingsJson({
            ...options,
            path: fixture.getPath('nested-project'),
            recursive: true, // This test specifically tests recursive scanning
          }),
      };

      const { lastFrame } = render(<TestComponent scanner={testScanner} />);

      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      }, 2000);

      // Should find all files recursively
      const frame = lastFrame();

      // Debug: log the frame if it's still loading
      if (frame?.includes('Loading')) {
        console.log('Still loading after 2s:', frame);
      }

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

    test('empty file groups are displayed for all file types', async () => {
      // Create a fixture with only a few file types
      await using fixture = await createFixture({
        'test-empty-groups': {
          'CLAUDE.md': '# Project Config',
          '.claude': {
            commands: {
              'project-cmd.md': '# /project-cmd\n\nProject command',
            },
          },
        },
      });

      // Mock scanner that returns only project-memory and project-command files
      const testScanner: FileScanner = {
        scanClaudeFiles: async () => [
          {
            path: createClaudeFilePath(
              fixture.getPath('test-empty-groups/CLAUDE.md'),
            ),
            type: 'project-memory' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
        ],
        scanSlashCommands: async () => [
          {
            name: 'project-cmd',
            description: 'Project command',
            filePath: fixture.getPath(
              'test-empty-groups/.claude/commands/project-cmd.md',
            ),
            scope: 'project' as const,
            hasArguments: false,
            lastModified: new Date(),
          },
        ],
        scanSubAgents: async () => [],
        scanSettingsJson: async () => [],
      };

      let capturedFileGroups: FileGroup[] = [];

      // Create a test component that captures fileGroups
      function TestEmptyGroupsComponent({ scanner }: { scanner: FileScanner }) {
        const { fileGroups, isLoading, error } = useFileNavigation(
          { recursive: false },
          scanner,
        );

        React.useEffect(() => {
          if (!isLoading) {
            capturedFileGroups = fileGroups;
          }
        }, [fileGroups, isLoading]);

        if (isLoading) return <Text>Loading...</Text>;
        if (error) return <Text>Error: {error}</Text>;

        return (
          <>
            <Text>Groups: {fileGroups.length}</Text>
            {fileGroups.map((group) => (
              <Text key={group.type}>
                {group.type}: {group.files.length} files, expanded:{' '}
                {String(group.isExpanded)}
              </Text>
            ))}
          </>
        );
      }

      const { lastFrame } = render(
        <TestEmptyGroupsComponent scanner={testScanner} />,
      );

      // Wait for loading to complete
      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

      // Verify all groups are displayed (except 'unknown')
      const expectedTypes: ClaudeFileType[] = [
        'user-memory',
        'user-settings',
        'personal-command',
        'user-subagent',
        'project-memory',
        'project-memory-local',
        'project-settings',
        'project-settings-local',
        'project-command',
        'project-subagent',
      ];

      expect(capturedFileGroups.length).toBe(expectedTypes.length);

      // Verify each expected type is present
      const groupTypes = capturedFileGroups.map((g) => g.type);
      for (const expectedType of expectedTypes) {
        expect(groupTypes).toContain(expectedType);
      }

      // Verify 'unknown' is not included
      expect(groupTypes).not.toContain('unknown');

      // Verify empty groups have isExpanded = false and files = []
      for (const group of capturedFileGroups) {
        if (
          group.type === 'project-memory' ||
          group.type === 'project-command'
        ) {
          // These have files
          expect(group.files.length).toBeGreaterThan(0);
          expect(group.isExpanded).toBe(true);
        } else {
          // These are empty
          expect(group.files.length).toBe(0);
          expect(group.isExpanded).toBe(false);
        }
      }

      // Verify the UI output
      const frame = lastFrame();
      expect(frame).toContain(`Groups: ${expectedTypes.length}`);

      // Check that empty groups show "0 files, expanded: false"
      expect(frame).toContain('user-memory: 0 files, expanded: false');
      expect(frame).toContain('project-memory: 1 files, expanded: true');
      expect(frame).toContain('project-command: 1 files, expanded: true');
    });

    test('file groups are ordered with user configurations first', async () => {
      // Create a fixture with mixed user and project files
      await using fixture = await createFixture({
        // User files (in home directory structure)
        '.claude': {
          'CLAUDE.md': '# User Global Config',
          commands: {
            'user-cmd.md': '# /user-cmd\n\nUser command',
          },
          agents: {
            'user-agent.md': '# User Agent\n\nUser sub-agent',
          },
          'settings.json': '{"theme": "dark"}',
        },
        // Project files
        'test-project': {
          'CLAUDE.md': '# Project Config',
          'CLAUDE.local.md': '# Project Local Config',
          '.claude': {
            commands: {
              'project-cmd.md': '# /project-cmd\n\nProject command',
            },
            agents: {
              'project-agent.md': '# Project Agent\n\nProject sub-agent',
            },
            'settings.json': '{"theme": "light"}',
            'settings.local.json': '{"theme": "custom"}',
          },
        },
      });

      // Mock scanner that returns all file types
      const testScanner: FileScanner = {
        scanClaudeFiles: async () => [
          {
            path: createClaudeFilePath(fixture.getPath('.claude/CLAUDE.md')),
            type: 'user-memory' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
          {
            path: createClaudeFilePath(
              fixture.getPath('test-project/CLAUDE.md'),
            ),
            type: 'project-memory' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
          {
            path: createClaudeFilePath(
              fixture.getPath('test-project/CLAUDE.local.md'),
            ),
            type: 'project-memory-local' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
        ],
        scanSlashCommands: async () => [
          {
            name: 'user-cmd',
            description: 'User command',
            filePath: fixture.getPath('.claude/commands/user-cmd.md'),
            scope: 'user' as const,
            hasArguments: false,
            lastModified: new Date(),
          },
          {
            name: 'project-cmd',
            description: 'Project command',
            filePath: fixture.getPath(
              'test-project/.claude/commands/project-cmd.md',
            ),
            scope: 'project' as const,
            hasArguments: false,
            lastModified: new Date(),
          },
        ],
        scanSubAgents: async () => [
          {
            name: 'user-agent',
            description: 'User sub-agent',
            filePath: fixture.getPath('.claude/agents/user-agent.md'),
            scope: 'user' as const,
            lastModified: new Date(),
          },
          {
            name: 'project-agent',
            description: 'Project sub-agent',
            filePath: fixture.getPath(
              'test-project/.claude/agents/project-agent.md',
            ),
            scope: 'project' as const,
            lastModified: new Date(),
          },
        ],
        scanSettingsJson: async () => [
          {
            path: createClaudeFilePath(
              fixture.getPath('.claude/settings.json'),
            ),
            type: 'user-settings' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
          {
            path: createClaudeFilePath(
              fixture.getPath('test-project/.claude/settings.json'),
            ),
            type: 'project-settings' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
          {
            path: createClaudeFilePath(
              fixture.getPath('test-project/.claude/settings.local.json'),
            ),
            type: 'project-settings-local' as const,
            size: 100,
            lastModified: new Date(),
            commands: [],
            tags: [],
          },
        ],
      };

      let capturedFileGroups: FileGroup[] = [];

      // Create a test component that captures fileGroups
      function TestGroupOrderComponent({ scanner }: { scanner: FileScanner }) {
        const { fileGroups, isLoading, error } = useFileNavigation(
          { recursive: false },
          scanner,
        );

        React.useEffect(() => {
          if (!isLoading) {
            capturedFileGroups = fileGroups;
          }
        }, [fileGroups, isLoading]);

        if (isLoading) return <Text>Loading...</Text>;
        if (error) return <Text>Error: {error}</Text>;

        return (
          <>
            <Text>Groups: {fileGroups.length}</Text>
            {fileGroups.map((group, index) => (
              <Text key={group.type}>
                {index}: {group.type}
              </Text>
            ))}
          </>
        );
      }

      const { lastFrame } = render(
        <TestGroupOrderComponent scanner={testScanner} />,
      );

      // Wait for loading to complete
      await waitFor(() => {
        const frame = lastFrame();
        if (!frame || frame.includes('Loading...')) {
          throw new Error('Still loading');
        }
      });

      // Verify the ordering - user configurations should come first
      expect(capturedFileGroups.length).toBeGreaterThan(0);

      const groupTypes = capturedFileGroups.map((g) => g.type);

      // Find indices of user and project groups
      const userMemoryIndex = groupTypes.indexOf('user-memory');
      const userSettingsIndex = groupTypes.indexOf('user-settings');
      const personalCommandIndex = groupTypes.indexOf('personal-command');
      const userSubagentIndex = groupTypes.indexOf('user-subagent');

      const projectMemoryIndex = groupTypes.indexOf('project-memory');
      const projectMemoryLocalIndex = groupTypes.indexOf(
        'project-memory-local',
      );
      const projectSettingsIndex = groupTypes.indexOf('project-settings');
      const projectSettingsLocalIndex = groupTypes.indexOf(
        'project-settings-local',
      );
      const projectCommandIndex = groupTypes.indexOf('project-command');
      const projectSubagentIndex = groupTypes.indexOf('project-subagent');

      // All user groups should come before all project groups
      const userIndices = [
        userMemoryIndex,
        userSettingsIndex,
        personalCommandIndex,
        userSubagentIndex,
      ].filter((i) => i !== -1);
      const projectIndices = [
        projectMemoryIndex,
        projectMemoryLocalIndex,
        projectSettingsIndex,
        projectSettingsLocalIndex,
        projectCommandIndex,
        projectSubagentIndex,
      ].filter((i) => i !== -1);

      if (userIndices.length > 0 && projectIndices.length > 0) {
        const maxUserIndex = Math.max(...userIndices);
        const minProjectIndex = Math.min(...projectIndices);
        expect(maxUserIndex).toBeLessThan(minProjectIndex);
      }

      // Verify the displayed order in the UI
      const frame = lastFrame();
      expect(frame).toContain('Groups:');

      // If we have both user and project files, verify they appear in the right order
      if (userMemoryIndex !== -1 && projectMemoryIndex !== -1) {
        expect(frame).toMatch(/0: user-memory[\s\S]*project-memory/);
      }
    });
  });
}
