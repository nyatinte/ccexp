export const theme = {
  selection: {
    backgroundColor: 'cyan',
    color: 'black',
  },
  fileTypes: {
    // Memory category - Orange
    projectMemory: '#FF8A65',
    projectMemoryLocal: '#FFAB91',
    userMemory: '#FF8A65',

    // Settings category - Cyan
    projectSettings: '#4DD0E1',
    projectSettingsLocal: '#80DEEA',
    userSettings: '#4DD0E1',

    // Command category - Green
    projectCommand: '#66BB6A',
    personalCommand: '#66BB6A',

    // Agent category - Magenta
    projectSubagent: '#C47FD5',
    userSubagent: '#C47FD5',

    // Other
    unknown: 'gray',
  },
  status: {
    error: 'red',
    success: 'green',
    warning: 'yellow',
    info: 'cyan',
  },
  ui: {
    focus: 'white',
    appTitle: 'blue',
    spinner: 'yellow',
    sectionTitle: 'cyan',
  },
} as const;
