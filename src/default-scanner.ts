import type { FileScanner } from './_types.js';
import { scanClaudeFiles } from './claude-md-scanner.js';
import { scanSlashCommands } from './slash-command-scanner.js';
import { scanSubAgents } from './sub-agent-scanner.js';

export const defaultScanner: FileScanner = {
  scanClaudeFiles,
  scanSlashCommands,
  scanSubAgents,
} as const;
