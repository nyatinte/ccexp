export const theme = {
  selection: {
    backgroundColor: 'cyan',
    color: 'black',
  },
  fileTypes: {
    // Memory category - Blue theme
    projectMemory: 'blue',
    projectMemoryLocal: 'blueBright',
    userMemory: 'blue',

    // Settings category - Cyan theme
    projectSettings: 'cyan',
    projectSettingsLocal: 'cyanBright',
    userSettings: 'cyan',

    // Command category - Green theme
    projectCommand: 'green',
    personalCommand: 'green',

    // Agent category - Magenta theme
    projectSubagent: 'magenta',
    userSubagent: 'magenta',

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
