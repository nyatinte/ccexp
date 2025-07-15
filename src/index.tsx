#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import { render } from 'ink';
import { z } from 'zod/v4';
import type { CliOptions } from './_types.js';
import { App } from './App.js';

// Load package.json in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
);

// CLI configuration
program
  .name('ccexp')
  .description(
    'Interactive CLI tool for exploring Claude Code settings and slash commands',
  )
  .version(packageJson.version)
  .option('-p, --path <path>', 'specify directory to scan', process.cwd())
  .parse();

// Zod schema for CLI options validation
const CliOptionsSchema = z.object({
  path: z.string().optional(),
  help: z.boolean().optional(),
  version: z.boolean().optional(),
});

const rawOptions = program.opts();
const options = CliOptionsSchema.parse(rawOptions) as CliOptions;

// Render React app (interactive mode)
render(<App cliOptions={options} />);
