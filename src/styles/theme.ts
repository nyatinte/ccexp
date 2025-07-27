export const theme = {
  selection: {
    backgroundColor: 'cyan',
    color: 'black',
  },
  fileTypes: {
    claudeMd: 'blue',
    claudeLocalMd: 'yellow',
    slashCommand: 'green',
    globalMd: 'magenta',
    settingsJson: 'cyan',
    settingsLocalJson: 'yellowBright',
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
