import type { FileScanner } from './_types.js';
import { scanClaudeFiles } from './claude-md-scanner.js';
import { scanSettingsJson } from './settings-json-scanner.js';
import { scanSlashCommands } from './slash-command-scanner.js';
import { scanSubAgents } from './subagent-scanner.js';

export const defaultScanner: FileScanner = {
  scanClaudeFiles,
  scanSlashCommands,
  scanSubAgents,
  scanSettingsJson,
} as const;
