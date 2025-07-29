export const theme = {
  selection: {
    backgroundColor: 'cyan',
    color: 'black',
  },
  fileTypes: {
    projectMemory: 'blue',
    projectMemoryLocal: 'yellow',
    projectCommand: 'green',
    personalCommand: 'greenBright',
    userMemory: 'magenta',
    projectSubagent: 'cyan',
    userSubagent: 'cyanBright',
    projectSettings: 'cyan',
    projectSettingsLocal: 'yellowBright',
    userSettings: 'magentaBright',
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
