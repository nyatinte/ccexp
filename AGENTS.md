# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**ccexp** (short for claude-code-explorer) - React Ink-based CLI tool for exploring and managing Claude Code settings and slash commands. The tool provides an interactive terminal UI for file navigation, content preview, and file management operations. The package was renamed from `claude-code-explorer` to `ccexp` for brevity and easier command-line usage.

## Core Commands

```bash
# Development
bun run start                   # Run CLI in development mode
bun run build                   # Build for production (outputs to dist/)
bun run typecheck              # TypeScript type checking

# Testing (InSource Testing Pattern)
bun run test                   # Run all tests
bun run test:watch            # Test in watch mode
bun run test src/_utils.ts    # Run tests for specific file

# Quality Management
bun run check                  # Biome lint/format check
bun run check:write           # Biome auto-fix
bun run check:unsafe          # Biome unsafe auto-fix
bun run knip                  # Check for unused dependencies/exports
bun run ci                    # Full CI pipeline (build + check + typecheck + knip + test)

# Release Management
bun run release               # Interactive version bumping with bumpp
bun run prepack              # Pre-publish build and package.json cleanup

# CLI Usage
./dist/index.js               # Interactive React Ink TUI mode
bun run start                 # Development mode with hot reload
bun run dev                   # Development mode with watch
```

## Technical Architecture

### Main Tech Stack

- **Runtime**: Bun + Node.js (>= 20) - ESM only
- **React TUI Framework**: React Ink (v6) for terminal UI components
- **UI Components**: @inkjs/ui for enhanced terminal components (TextInput, Spinner, StatusMessage)
- **Build**: tsdown (Rolldown/Oxc) → produces shebang executable with type definitions
  - Configured in `tsdown.config.ts` for ESM-only output
  - Automatic shebang injection for CLI usage
  - Type definition generation with `dts: true`
- **Testing**: vitest (InSource Testing + globals) + ink-testing-library
- **Linting**: Biome (v2.0.6) with strict rules
- **Dependency Management**: knip for unused dependency detection
- **File Operations**: fdir for fast directory scanning + node:fs/promises
- **Pattern Matching**: ts-pattern for complex conditional logic
- **Validation**: zod + branded types for runtime type safety
- **System Integration**: open, clipboardy for file operations

### Core Architecture Patterns

1. **InSource Testing**: Tests defined alongside source code for co-location

   ```typescript
   if (import.meta.vitest != null) {
     const { describe, test, expect } = import.meta.vitest;
     describe('functionName', () => {
       test('should work', () => {
         expect(result).toBe(expected);
       })
     })
   }
   ```

2. **Simplified Type System**: Clean types with runtime validation where needed

   ```typescript
   // Simple type alias approach
   export type ClaudeFilePath = string;

   // Runtime validation helper
   export const createClaudeFilePath = (path: string): ClaudeFilePath => {
     if (path.length === 0) {
       throw new Error('Path must not be empty');
     }
     return path;
   };
   ```

3. **React Ink Component Architecture**: React-based terminal UI

   ```typescript
   export function FileList({ files, onFileSelect }: FileListProps) {
     const [currentIndex, setCurrentIndex] = useState(0);
     const [isMenuMode, setIsMenuMode] = useState(false);

     useInput((input, key) => {
       // Handle keyboard navigation
     }, { isActive: !isMenuMode });

     return (
       <Box flexDirection="column">
         {/* File list UI */}
       </Box>
     );
   }
   ```

4. **Pattern Matching for File Type Detection**:

   ```typescript
   const detectClaudeFileType = (fileName: string, dirPath: string): ClaudeFileType => {
     return match([fileName, dirPath])
       .with(['CLAUDE.md', P._], () => 'project-memory' as const)
       .with(['CLAUDE.local.md', P._], () => 'project-memory-local' as const)
       .otherwise(() => 'unknown' as const);
   };
   ```

5. **React Ink Focus Management**: Proper input handling with `isActive` pattern

   ```typescript
   // FileList component
   useInput((input, key) => {
     if (key.upArrow) setCurrentIndex(prev => Math.max(0, prev - 1));
     if (key.downArrow) setCurrentIndex(prev => Math.min(files.length - 1, prev + 1));
     if (key.return) setIsMenuMode(true);
   }, { isActive: !isMenuMode });

   // MenuActions component
   useInput((input, key) => {
     if (key.escape) onClose();
     // Handle menu actions
   }, { isActive: true });
   ```

6. **Scanner Hierarchy**: Modular scanner architecture with base class

   ```typescript
   // Base scanner provides common functionality
   export abstract class BaseFileScanner<T> {
     protected abstract readonly maxFileSize: number;
     protected abstract readonly fileType: string;

     async processFile(filePath: string): Promise<T | null> {
       // Common file processing logic
     }

     protected abstract parseContent(
       filePath: string,
       content: string,
       stats: Stats,
     ): Promise<T | null>;
   }

   // Specialized scanners extend base
   class ClaudeMdScanner extends BaseFileScanner<ClaudeFileInfo> {
     protected readonly maxFileSize = FILE_SIZE_LIMITS.MAX_CLAUDE_MD_SIZE;
     protected readonly fileType = 'Claude.md';
   }
   ```

### Data Flow Architecture

- **Scanners**: Multiple specialized scanners → discover files
  - `base-file-scanner.ts` → Abstract base class for all scanners
  - `claude-md-scanner.ts` → CLAUDE.md file discovery
  - `slash-command-scanner.ts` → Slash command discovery
  - `subagent-scanner.ts` → Subagent definition discovery
  - `settings-json-scanner.ts` → Settings JSON file discovery
  - `default-scanner.ts` → Combined scanner for all file types
  - `fast-scanner.ts` → High-performance directory traversal
- **Type System**: `lib/types.ts` → Type definitions with runtime validation helpers
- **React State**: `useFileNavigation` hook → file loading and selection state
- **Components**: React Ink components → interactive terminal UI
- **File Operations**: clipboard, file opening via system integrations
- **Exclusions**: `scan-exclusions.ts` → Configurable file/directory filtering

### Target File Discovery

The tool automatically discovers these file types:

- **CLAUDE.md** → Project-level configuration (most common)
- **CLAUDE.local.md** → Local overrides (gitignored)
- **~/.claude/CLAUDE.md** → Global user configuration
- **.claude/commands/**/*.md** → Slash command definitions
- **.claude/agents/**/*.md** → Subagent definitions (project-level)
- **~/.claude/agents/**/*.md** → Subagent definitions (user-level)
- **.claude/settings.json** → Project settings (shared)
- **.claude/settings.local.json** → Local project settings (gitignored)
- **~/.claude/settings.json** → User settings (global)

### TypeScript Configuration

**Ultra-strict type checking** enabled via tsconfig.json:

- `exactOptionalPropertyTypes: true` → No `| undefined` on optional props
- `noUncheckedIndexedAccess: true` → Array access returns `T | undefined`
- `noImplicitReturns: true` → All code paths must return
- Immutable design with `readonly` properties throughout

### Testing Philosophy & Strategy

#### Core Testing Principles

- **InSource Testing**: Tests live with source code for component co-location
- **fs-fixture**: File system test fixtures for reliable testing
- **ink-testing-library**: React Ink component testing utilities
- **vitest globals**: `describe`/`test`/`expect` available without imports
- **No test shortcuts**: All quality checks must pass before completion
- **Comprehensive coverage**: React components, hooks, and business logic tested

#### Efficient Test Architecture with fs-fixture

The project employs a sophisticated testing strategy using `fs-fixture` for creating isolated file system environments:

```typescript
// Example from test-fixture-helpers.ts
export async function withTempFixture<T>(
  fileTree: FileTree,
  callback: (fixture: FsFixture) => Promise<T>,
): Promise<T> {
  await using fixture = await createFixture(fileTree);
  return callback(fixture);
}

// Usage example
await withTempFixture(
  { 'test.md': '# Test content' },
  async (fixture) => {
    const content = await fixture.readFile('test.md', 'utf-8');
    // Test logic here
  }
);
```

#### Scanner Testing Strategy

File scanners are tested using fs-fixture to create isolated file environments:

```typescript
// Example from claude-md-scanner.ts tests
await using fixture = await createClaudeProjectFixture({
  projectName: 'test-scan',
  includeLocal: true,
  includeCommands: true,
});

const result = await scanClaudeFiles({
  path: fixture.getPath('test-scan'),
  recursive: false,
});

// The scanner internally uses a singleton pattern
const scanner = new ClaudeMdScanner();
const fileInfo = await scanner.processFile(filePath);
```

#### Test Helper Architecture

- **test/utils/fixture-helpers.ts**: Factory functions for creating test file structures with fs-fixture
- **test/utils/keyboard-helpers.ts**: Keyboard event simulation for React Ink components
- **test/utils/interaction-helpers.ts**: UI interaction testing utilities
- **test/utils/navigation.ts**: Navigation flow testing helpers
- **test/utils/test-utils.ts**: Common testing utilities and assertions

#### Testing Configuration

**vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    includeSource: ['src/**/*.{js,ts,tsx}'],
    exclude: ['node_modules'],
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
```

This configuration enables:
- InSource testing pattern with tests alongside source code
- Global test functions without imports (describe, test, expect)
- Proper React JSX transformation for terminal UI components
- Consistent test environment with mocked external dependencies

### React Ink User Experience

- **Interactive TUI**: Full-screen terminal interface with React Ink
- **Split-pane layout**: File list on left, preview on right
- **Keyboard navigation**: Arrow keys, Enter, ESC, Tab for navigation
- **Search functionality**: Live filtering with TextInput component
- **File actions**: Copy content, copy paths, open files via context menu
- **Focus management**: `isActive` pattern prevents input conflicts
- **Error handling**: StatusMessage component with graceful degradation
- **Loading states**: Spinner component during file scanning
- **File grouping**: Organized display by file type with collapsible groups
  - User configurations displayed first (memory, settings, commands, agents)
  - Project configurations follow (memory, settings, commands, agents)
  - Groups show file count even when empty (e.g., "User memory (0)")
  - Groups can be collapsed/expanded with arrow keys
  - High-contrast colors optimized for black terminal backgrounds

## Quality Management Rules

### Mandatory Pre-Submission Checklist

**All tasks MUST complete this full pipeline before submission:**

```bash
# Complete pipeline (run in sequence)
bun run typecheck              # TypeScript: 0 errors required
bun run check:write           # Biome: Auto-fix + 0 errors required
bun run knip                  # Dependency cleanup: 0 unused items required
bun run test                  # Tests: 100% pass rate required
bun run build                 # Build: Must complete without errors
```

**Alternative single command:**

```bash
bun run ci                    # Runs build + check + typecheck + knip + test in sequence
```

### Quality Standards (Zero Tolerance)

- **TypeScript**: 0 type errors (strict mode enforced)
- **Biome**: 0 lint/format errors (style rules strictly enforced)
- **Knip**: 0 unused dependencies, exports, or types (clean dependency management)
- **Tests**: 100% pass rate for all React components and business logic
- **Build**: Clean tsdown build to dist/ with executable permissions

### Implementation Rules

- **No shortcuts**: Never skip quality checks or claim completion with failing tests
- **No flag shortcuts**: NEVER use `-n` or similar flags to skip quality checks
- **Fix, don't disable**: Resolve lint errors rather than adding ignore comments
- **Test coverage**: InSource tests required for all utility functions
- **Error handling**: Graceful degradation with user-friendly error messages
- **Dependency management**: Keep dependencies clean - remove unused imports and exports immediately
- **No unnecessary comments**: Code should be self-documenting; avoid redundant comments
- **Use English**: All code, comments, and documentation must be in English for consistency

### TypeScript Coding Standards (Strictly Enforced)

- **Type definitions**: ALWAYS use `type` instead of `interface` for consistency and better type inference
- **Function definitions**:
  - **Components**: Use `function` declaration syntax
  - **Regular functions**: Use arrow function syntax
- **Exports**: Avoid `default export` except for page components
- **Type safety**:
  - NEVER use `any` type - it is strictly forbidden
  - Avoid `as` type assertions - use proper type guards instead
- **Code organization**: Follow established patterns in the codebase for consistency

### Development Workflow Integration

- Use `bun run test:watch` during development
- Run `bun run check:write` frequently to auto-fix formatting
- Verify with `bun run ci` before considering task complete

## Git Hooks

The project uses Lefthook for pre-commit hooks:

```bash
# Automatically runs on git commit:
bun run ci  # Full quality pipeline
```

This ensures all code meets quality standards before committing.

## Release Management

### npm Publishing Setup

The project is configured for automated npm publishing via GitHub Actions:

- **Version Management**: Uses `bumpp` for interactive version bumping
- **Release Workflow**: Tag-based automatic publishing to npm
- **Preview Packages**: PRs automatically publish preview packages via `pkg-pr-new`

### Release Process

```bash
# 1. Ensure all changes are committed and tests pass
bun run ci

# 2. Bump version interactively
bun run release
# Select version type:
# - patch (1.0.0 → 1.0.1): Bug fixes
# - minor (1.0.0 → 1.1.0): New features
# - major (1.0.0 → 2.0.0): Breaking changes
# - custom: Specify exact version

# 3. Push changes and tags to trigger automatic npm publish
git push --follow-tags
```

### Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **PATCH**: Backwards-compatible bug fixes, documentation updates
- **MINOR**: New features, new file type support, backwards-compatible additions
- **MAJOR**: Breaking changes, removed features, Node.js requirement changes

### Required Setup

Before first release:

1. Add `NPM_TOKEN` to GitHub repository secrets
2. Verify package name availability: `npm view ccexp`
3. Ensure npm account has publishing permissions

See `VERSIONING.md` for detailed versioning strategy and commit message conventions.

## Naming Conventions

### Terminology from Anthropic Documentation

This project follows the official terminology from https://docs.anthropic.com:

- **subagent** (not sub-agent) - Specialized AI assistants for specific tasks
- **slash command** (not slash-command) - Custom commands starting with /
- **Claude Code** - The official CLI tool name
- **CLAUDE.md** - Configuration file names (uppercase)

### Compound Word Rules

- Use single words without hyphens for established terms: `subagent`, `codebase`
- Use hyphens for clarity when needed: `project-specific`, `user-level`
- Follow TypeScript naming conventions for code identifiers

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request with the following jobs:

1. **Build** - Verifies the project builds correctly
2. **Lint & Format** - Ensures code style compliance with Biome
3. **TypeScript Check** - Validates type safety
4. **Knip** - Checks for unused dependencies
5. **Tests** - Runs all unit and integration tests
6. **Preview Package** - Publishes preview packages for PRs via `pkg-pr-new`

All jobs run in parallel for efficiency, with PR preview packages only published after all checks pass.
