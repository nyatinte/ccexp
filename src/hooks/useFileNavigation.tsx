import { groupBy } from 'es-toolkit/array';
import { values } from 'es-toolkit/compat';
import { merge } from 'es-toolkit/object';
import { useCallback, useEffect, useState } from 'react';
import type {
  ClaudeFileInfo,
  ClaudeFileType,
  FileGroup,
  FileScanner,
  ScanOptions,
  SlashCommandInfo,
  SubAgentInfo,
} from '../_types.js';
import { defaultScanner } from '../default-scanner.js';

// Union type to unify ClaudeFileInfo and SlashCommandInfo
type NavigationFile = ClaudeFileInfo;

// Convert SlashCommandInfo to ClaudeFileInfo format
const convertSlashCommandToFileInfo = (
  command: SlashCommandInfo,
): ClaudeFileInfo => ({
  path: command.filePath,
  type: command.scope === 'user' ? 'personal-command' : 'project-command',
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

const convertSubAgentToFileInfo = (agent: SubAgentInfo): ClaudeFileInfo => ({
  path: agent.filePath,
  type: agent.scope === 'project' ? 'project-subagent' : 'user-subagent',
  size: 0, // No size information for subagents
  lastModified: agent.lastModified,
  commands: [], // No commands in subagents
  tags: [], // No tags for subagents
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
  const { path } = options;

  useEffect(() => {
    // Execute file scan
    const scanOptions = { path };
    Promise.all([
      scanner.scanClaudeFiles(scanOptions),
      scanner.scanSlashCommands(scanOptions),
      scanner.scanSubAgents(scanOptions),
      scanner.scanSettingsJson(scanOptions),
    ])
      .then(([claudeFiles, slashCommands, subAgents, settingsFiles]) => {
        // Convert slash commands to ClaudeFileInfo format
        const convertedCommands = slashCommands.map(
          convertSlashCommandToFileInfo,
        );

        const convertedAgents = subAgents.map(convertSubAgentToFileInfo);

        // Combine all results
        const allFiles = [
          ...claudeFiles,
          ...convertedCommands,
          ...convertedAgents,
          ...settingsFiles,
        ];

        // Group files by type using es-toolkit
        const groupedFiles = groupBy(allFiles, (file) => file.type) as Record<
          ClaudeFileType,
          NavigationFile[]
        >;

        // Sort by filename within each group
        values(groupedFiles).forEach((group) => {
          group.sort((a, b) => {
            const aName = a.path.split('/').pop() || '';
            const bName = b.path.split('/').pop() || '';
            return aName.localeCompare(bName);
          });
        });

        // Create FileGroup array (in predefined order)
        // User-first ordering: User configs → Project configs
        const orderedTypes: ClaudeFileType[] = [
          // User configurations
          'user-memory',
          'user-settings',
          'personal-command',
          'user-subagent',
          // Project configurations
          'project-memory',
          'project-memory-local',
          'project-settings',
          'project-settings-local',
          'project-command',
          'project-subagent',
          // Other
          'unknown',
        ];

        // Create groups for all types except 'unknown', including empty groups
        const groups: FileGroup[] = orderedTypes
          .filter((type) => type !== 'unknown') // exclude unknown
          .map((type) => ({
            type,
            files: groupedFiles[type] || [], // empty array if no files
            isExpanded: !!groupedFiles[type] && groupedFiles[type].length > 0, // empty groups are not expandable
          }));

        // Add unknown type at the end if it exists
        if (groupedFiles.unknown && groupedFiles.unknown.length > 0) {
          groups.push({
            type: 'unknown',
            files: groupedFiles.unknown,
            isExpanded: true,
          });
        }

        setFileGroups(groups);
        setFiles(allFiles);

        // Auto-select first file from the first non-empty group
        const firstNonEmptyGroup = groups.find(
          (group) => group.files.length > 0,
        );
        if (firstNonEmptyGroup && firstNonEmptyGroup.files.length > 0) {
          const firstFile = firstNonEmptyGroup.files[0];
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
  }, [path, scanner]);

  const selectFile = useCallback((file: NavigationFile): void => {
    setSelectedFile(file);
  }, []);

  const toggleGroup = useCallback((type: ClaudeFileType): void => {
    setFileGroups((prev) =>
      prev.map((group) =>
        group.type === type
          ? merge(group, { isExpanded: !group.isExpanded })
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
