# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**ccexp** - React Ink-based CLI tool for exploring and managing Claude Code settings and slash commands. The tool provides an interactive terminal UI for file navigation, content preview, and file management operations.

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
- **Build**: tsdown (Rolldown/Oxc) → produces shebang executable
- **Testing**: vitest (InSource Testing + globals) + ink-testing-library
- **Linting**: Biome (v2.0.6) with strict rules
- **Dependency Management**: knip for unused dependency detection
- **File Operations**: fdir for fast directory scanning + node:fs/promises
- **Pattern Matching**: ts-pattern for complex conditional logic
- **Validation**: zod + branded types for runtime type safety
- **System Integration**: open, clipboardy for file operations

### Directory Structure

```sh
src/
├── components/        # React Ink UI components
│   ├── FileList/      # File navigation and menu
│   │   ├── FileList.tsx      # Main file list with search
│   │   ├── FileItem.tsx      # Individual file item
│   │   ├── MenuActions.tsx   # File action menu
│   │   └── *.test.tsx        # Component tests
│   ├── Layout/        # Layout components
│   │   ├── SplitPane.tsx     # Two-pane layout
│   │   └── *.test.tsx        # Layout tests
│   ├── Preview/       # Content preview
│   │   ├── Preview.tsx       # File preview pane
│   │   └── MarkdownPreview.tsx # Markdown renderer
│   └── ErrorBoundary.tsx     # Error handling component
├── hooks/             # React hooks
│   ├── useFileNavigation.tsx # File scanning and state
│   └── index.ts       # Hook exports
├── _types.ts          # Type definitions (including branded types)
├── _consts.ts         # Constants and configuration
├── _utils.ts          # Utility functions with InSource tests
├── claude-md-scanner.ts    # CLAUDE.md file scanner
├── slash-command-scanner.ts # Slash command scanner
├── fast-scanner.ts    # High-performance file scanner
├── App.tsx            # Main React application
└── index.tsx          # Entry point with React Ink render
```

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

2. **Branded Types + Runtime Validation**: Compile-time & runtime type safety

   ```typescript
   // Type-level branding
   export type ClaudeFilePath = string & { readonly [ClaudeFilePathBrand]: true };

   // Runtime validation
   export const ClaudeFilePathSchema = z.string().refine(/* validation */);
   export const createClaudeFilePath = (path: string): ClaudeFilePath => {
     ClaudeFilePathSchema.parse(path);
     return path as ClaudeFilePath;
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
       .with(['CLAUDE.md', P._], () => 'claude-md' as const)
       .with(['CLAUDE.local.md', P._], () => 'claude-local-md' as const)
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

### Data Flow Architecture

- **Scanners**: `claude-md-scanner.ts` + `slash-command-scanner.ts` → discover files
- **Type System**: `_types.ts` → branded types + zod schemas for data integrity
- **React State**: `useFileNavigation` hook → file loading and selection state
- **Components**: React Ink components → interactive terminal UI
- **File Operations**: clipboard, file opening via system integrations

### Target File Discovery

The tool automatically discovers these file types:

- **CLAUDE.md** → Project-level configuration (most common)
- **CLAUDE.local.md** → Local overrides (gitignored)
- **~/.claude/CLAUDE.md** → Global user configuration
- **.claude/commands/**/*.md** → Slash command definitions

### TypeScript Configuration

**Ultra-strict type checking** enabled via tsconfig.json:

- `exactOptionalPropertyTypes: true` → No `| undefined` on optional props
- `noUncheckedIndexedAccess: true` → Array access returns `T | undefined`
- `noImplicitReturns: true` → All code paths must return
- Immutable design with `readonly` properties throughout

### Testing Philosophy

- **InSource Testing**: Tests live with source code for component co-location
- **fs-fixture**: File system test fixtures for reliable testing
- **ink-testing-library**: React Ink component testing utilities
- **vitest globals**: `describe`/`test`/`expect` available without imports
- **No test shortcuts**: All quality checks must pass before completion
- **Comprehensive coverage**: React components, hooks, and business logic tested

### React Ink User Experience

- **Interactive TUI**: Full-screen terminal interface with React Ink
- **Split-pane layout**: File list on left, preview on right
- **Keyboard navigation**: Arrow keys, Enter, ESC, Tab for navigation
- **Search functionality**: Live filtering with TextInput component
- **File actions**: Copy content, copy paths, open files via context menu
- **Focus management**: `isActive` pattern prevents input conflicts
- **Error handling**: StatusMessage component with graceful degradation
- **Loading states**: Spinner component during file scanning

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
