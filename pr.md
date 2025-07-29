feat!: improve file list display with User/Project terminology and better organization

## Overview

This PR implements comprehensive improvements to the ccexp file list display by aligning with Anthropic's official documentation terminology, reorganizing file groups for better user experience, and applying consistent visual design across categories.

### As-Is
- Inconsistent terminology (e.g., "PROJECT" vs "GLOBAL" vs "COMMAND")
- File groups ordered without clear hierarchy
- Different colors for related file types
- Missing file location information in group labels

### To-Be
- Consistent User/Project terminology aligned with Anthropic's documentation
- User configurations displayed first, followed by Project configurations
- Unified color scheme by category (Memory, Settings, Command, Agent)
- Descriptive group labels with file locations (e.g., "User memory (~/.claude/CLAUDE.md)")

## Changes

### 1. File Type Naming Convention Migration (Breaking Change)
- Renamed all `ClaudeFileType` values to be more descriptive:
  - `'claude-md'` → `'project-memory'`
  - `'claude-local-md'` → `'project-memory-local'`
  - `'global-md'` → `'user-memory'`
  - `'slash-command'` → `'project-command'`
  - Added new type: `'personal-command'` for user-level commands

### 2. User-First File Organization
- Reordered file groups to prioritize user configurations:
  - User memory → User settings → User commands → User agents
  - Followed by Project configurations in the same logical order
- Improved discoverability of personal configurations

### 3. Unified Visual Design
- Applied consistent color themes by category:
  - **Memory files**: Blue theme (both user and project)
  - **Settings files**: Cyan theme
  - **Command files**: Green theme
  - **Agent files**: Magenta theme
- Better visual grouping and easier scanning

### 4. Enhanced UI Labels
- Updated group labels to include file locations:
  - "Project memory (CLAUDE.md)"
  - "User commands (~/.claude/commands/)"
- Updated file badges with consistent USER/PROJECT prefixes:
  - "USER MEMORY", "PROJECT COMMAND", etc.

## Benefits

- 🎯 **Better Alignment**: Terminology now matches Anthropic's official documentation
- 👤 **User-Centric**: Personal configurations are prioritized and easier to find
- 🎨 **Improved Visual Hierarchy**: Consistent colors make file types instantly recognizable
- 📍 **Clear Context**: File locations help users understand where files are stored
- 🔍 **Enhanced Discoverability**: Logical ordering and clear labels improve navigation


## Breaking Changes

⚠️ This PR includes breaking changes to the `ClaudeFileType` enum values. Any external code depending on these type names will need to be updated.