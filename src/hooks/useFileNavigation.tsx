import { useCallback, useEffect, useState } from 'react';
import type {
  ClaudeFileInfo,
  ClaudeFileType,
  FileGroup,
  FileScanner,
  ScanOptions,
  SlashCommandInfo,
} from '../_types.js';
import { defaultScanner } from '../default-scanner.js';

// Union type to unify ClaudeFileInfo and SlashCommandInfo
type NavigationFile = ClaudeFileInfo;

// Convert SlashCommandInfo to ClaudeFileInfo format
const convertSlashCommandToFileInfo = (
  command: SlashCommandInfo,
): ClaudeFileInfo => ({
  path: command.filePath,
  type: 'slash-command' as const,
  size: 0, // No size information for slash commands
  lastModified: command.lastModified,
  commands: [
    {
      name: command.name,
      description: command.description,
      hasArguments: command.hasArguments,
    },
  ],
  tags: command.namespace ? [command.namespace] : [],
});

type UseFileNavigationReturn = {
  files: NavigationFile[];
  fileGroups: FileGroup[];
  selectedFile: NavigationFile | undefined;
  isLoading: boolean;
  error: string | undefined;
  selectFile: (file: NavigationFile) => void;
  toggleGroup: (type: ClaudeFileType) => void;
};

export function useFileNavigation(
  options: ScanOptions = {},
  scanner: FileScanner = defaultScanner,
): UseFileNavigationReturn {
  const [files, setFiles] = useState<NavigationFile[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedFile, setSelectedFile] = useState<
    NavigationFile | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Destructure object dependencies
  const { path, recursive = true } = options;

  useEffect(() => {
    // Execute file scan
    const scanOptions = { recursive, path };
    Promise.all([
      scanner.scanClaudeFiles(scanOptions),
      scanner.scanSlashCommands(scanOptions),
    ])
      .then(([claudeFiles, slashCommands]) => {
        // Convert slash commands to ClaudeFileInfo format
        const convertedCommands = slashCommands.map(
          convertSlashCommandToFileInfo,
        );

        // Combine both results
        const allFiles = [...claudeFiles, ...convertedCommands];

        // Group files by type
        const groupedFiles = allFiles.reduce<
          Record<ClaudeFileType, NavigationFile[]>
        >(
          (acc, file) => {
            if (!acc[file.type]) {
              acc[file.type] = [];
            }
            acc[file.type].push(file);
            return acc;
          },
          {} as Record<ClaudeFileType, NavigationFile[]>,
        );

        // Sort by filename within each group
        Object.values(groupedFiles).forEach((group) => {
          group.sort((a, b) => {
            const aName = a.path.split('/').pop() || '';
            const bName = b.path.split('/').pop() || '';
            return aName.localeCompare(bName);
          });
        });

        // Create FileGroup array (in predefined order)
        const orderedTypes: ClaudeFileType[] = [
          'claude-md',
          'claude-local-md',
          'slash-command',
          'global-md',
          'unknown',
        ];
        const groups: FileGroup[] = orderedTypes
          .filter((type) => groupedFiles[type] && groupedFiles[type].length > 0)
          .map((type) => ({
            type,
            files: groupedFiles[type] || [],
            isExpanded: true, // All expanded by default
          }));

        setFileGroups(groups);
        setFiles(allFiles);

        // Auto-select first file (first file of first group)
        if (groups.length > 0 && groups[0] && groups[0].files.length > 0) {
          const firstFile = groups[0].files[0];
          if (firstFile) {
            setSelectedFile(firstFile);
          }
        }

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to scan files:', err);
        setError(err.message || 'Failed to scan files');
        setIsLoading(false);
      });
  }, [path, recursive, scanner]);

  const selectFile = useCallback((file: NavigationFile): void => {
    setSelectedFile(file);
  }, []);

  const toggleGroup = useCallback((type: ClaudeFileType): void => {
    setFileGroups((prev) =>
      prev.map((group) =>
        group.type === type
          ? { ...group, isExpanded: !group.isExpanded }
          : group,
      ),
    );
  }, []);

  return {
    files,
    fileGroups,
    selectedFile,
    isLoading,
    error,
    selectFile,
    toggleGroup,
  };
}
