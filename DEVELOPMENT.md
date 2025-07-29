# Development Guide

This guide contains all the information needed for developing and contributing to ccexp.

## Development Setup

### Prerequisites

- Node.js >= 20.11.0
- Bun (recommended) or npm/pnpm
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/nyatinte/ccexp.git
cd ccexp

# Install dependencies
bun install

# Run in development mode
bun run start      # Run with hot reload
bun run dev        # Development mode with --watch flag
```

### Building

```bash
bun run build      # Build for production
```

## Tech Stack

- **Runtime**: Bun + Node.js (>= 20.11.0)
- **UI Framework**: React Ink v6
- **Components**: @inkjs/ui for enhanced terminal components
- **Build**: tsdown (Rolldown/Oxc) with shebang executable
- **Testing**: vitest + ink-testing-library
- **Linting**: Biome with strict rules
- **Type Safety**: TypeScript with ultra-strict configuration

## CLI Reference

| Option      | Short | Description           | Default           |
| ----------- | ----- | --------------------- | ----------------- |
| `--help`    | `-h`  | Show help information | -                 |
| `--version` | `-V`  | Show version number   | -                 |
| `--path`    | `-p`  | Directory to scan     | Current directory |

## Development Commands

```bash
# Quality pipeline
bun run ci                    # Full CI pipeline
bun run typecheck            # TypeScript checking
bun run check:write          # Auto-fix formatting
bun run test                 # Run all tests
bun run test:watch           # Test in watch mode

# Development
bun run start                # Run CLI in development
bun run dev                  # Development with --watch flag
bun run build                # Build for production

# Additional commands
bun run knip                 # Check for unused dependencies/exports
bun run check                # Biome lint/format check
bun run check:unsafe         # Biome unsafe auto-fix
```

## Architecture

- **InSource Testing** - Tests alongside source code
- **Branded Types** - Compile-time and runtime type safety
- **React Ink Components** - Terminal UI with proper focus management
- **Pattern Matching** - File type detection with ts-pattern
- **Immutable Design** - Readonly properties throughout

### Directory Structure

```
src/
├── components/        # React Ink UI components
│   ├── FileList/      # File navigation and menu
│   ├── Layout/        # Layout components
│   ├── Preview/       # Content preview
│   └── ErrorBoundary.tsx
├── hooks/             # React hooks
├── _types.ts          # Type definitions
├── _consts.ts         # Constants
├── _utils.ts          # Utility functions
├── App.tsx            # Main React application
└── index.tsx          # Entry point
```

## Contributing

We welcome contributions! Please follow these steps:

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy of the repository.

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 4. Run Quality Checks

Before submitting, ensure all quality checks pass:

```bash
bun run ci  # Runs all checks: build, lint, typecheck, knip, test
```

Individual checks:
```bash
bun run typecheck      # TypeScript: 0 errors required
bun run check:write    # Biome: Auto-fix + 0 errors required
bun run knip           # Dependencies: 0 unused items required
bun run test           # Tests: 100% pass rate required
bun run build          # Build: Must complete without errors
```

### 5. Submit a Pull Request

- Push your changes to your fork
- Create a pull request from your feature branch
- Provide a clear description of your changes
- Reference any related issues

## Code Standards

### TypeScript

- **NEVER** use `any` type
- Avoid `as` type assertions - use proper type guards
- Use `type` instead of `interface` for consistency
- Function definitions:
  - Components: Use `function` declaration
  - Regular functions: Use arrow functions

### Code Quality

- No unnecessary comments
- Follow DRY and YAGNI principles
- Implement tests that mimic user behavior
- Ensure proper error handling

### React Ink Guidelines

- Use proper focus management with `isActive` pattern
- Handle keyboard input appropriately
- Provide loading states and error messages
- Ensure accessibility in terminal UI

## Testing

Tests are written using vitest with InSource Testing pattern:

```typescript
if (import.meta.vitest != null) {
  const { describe, test, expect } = import.meta.vitest;
  describe('functionName', () => {
    test('should work', () => {
      expect(result).toBe(expected);
    });
  });
}
```

Run tests:
```bash
bun run test          # Run all tests
bun run test:watch    # Test in watch mode
bun run test src/file.ts  # Test specific file
```


## User Interface

### Keyboard Shortcuts

- **↑/↓** - Navigate file list
- **Enter** - Open file actions menu
- **ESC** - Close menu / Exit
- **Tab** - Switch between panes
- **/** - Focus search input
- **c** - Copy file content (in menu)
- **p** - Copy absolute path (in menu)
- **r** - Copy relative path (in menu)
- **d** - Copy file to current directory (in menu)
- **e** - Edit file with $EDITOR (in menu)
- **o** - Open file in default application (in menu)

### Action Menu Operations

When you press Enter on a file, the following actions are available:

| Key | Action | Description |
|-----|--------|-------------|
| **c** | Copy Content | Copy file content to clipboard |
| **p** | Copy Path (Absolute) | Copy absolute file path to clipboard |
| **r** | Copy Path (Relative) | Copy relative file path to clipboard |
| **d** | Copy to Current Directory | Copy file to current working directory |
| **e** | Edit File | Open file in $EDITOR |
| **o** | Open File | Open file with default application |
| **ESC** | Cancel | Close menu without action |

## Troubleshooting

### Common Issues

1. **Build failures**: Ensure you have the correct Node.js version (>= 20.19.3)
2. **Test failures**: Check that all dependencies are installed with `bun install`
3. **Linting errors**: Run `bun run check:write` to auto-fix formatting issues

### Getting Help

- Check existing [issues](https://github.com/nyatinte/ccexp/issues)
- Review the [CLAUDE.md](./CLAUDE.md) file for project conventions
- Ask questions in GitHub Discussions