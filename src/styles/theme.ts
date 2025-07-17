export const theme = {
  selection: {
    backgroundColor: 'cyan' as const,
    color: 'black' as const,
  },
  fileTypes: {
    claudeMd: 'blue' as const,
    claudeLocalMd: 'yellow' as const,
    slashCommand: 'green' as const,
    globalMd: 'magenta' as const,
    unknown: 'gray' as const,
  },
  status: {
    error: 'red' as const,
    success: 'green' as const,
    warning: 'yellow' as const,
    info: 'cyan' as const,
  },
  ui: {
    focus: 'white' as const,
    appTitle: 'blue' as const,
    spinner: 'yellow' as const,
    sectionTitle: 'cyan' as const,
  },
} as const;
