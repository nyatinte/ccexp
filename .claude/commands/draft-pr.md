---
allowed-tools: Bash(git:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh repo view:*), Read(.github/PULL_REQUEST_TEMPLATE.md), Write(pr.md)
denied-tools: Bash(gh pr create:*), Bash(gh pr edit:*)
argument-hint: [additional instructions]
description: Draft PR content and write to pr.md file
---

Draft PR content with the following additional instructions: $ARGUMENTS

## Context

- Current branch: `!git branch --show-current`
- Remote tracking: `!git status -sb`
- Recent commits on this branch: `!git log origin/main..HEAD --oneline`
- Repository info: `!gh repo view --json owner,name`

## Your task

Create a PR draft in `pr.md` file based on the current branch changes.

## Steps

1. **Verify branch status**:
   - Ensure current branch is not main/master
   - Check if there are commits to create PR for
   - If no commits or on main branch, inform user and exit

2. **Check for existing PR**:
   - Check if PR already exists: `gh pr list --head $(git branch --show-current)`
   - If PR exists, get current PR details for comparison

3. **Analyze repository PR style**:
   - Search for past PRs: `gh pr list --state merged --limit 10`
   - Analyze recent PRs for:
     - Title format and language
     - Description structure
     - Common patterns

4. **Load PR template**:
   - Read `.github/PULL_REQUEST_TEMPLATE.md` if it exists
   - Use template structure as base

5. **Analyze changes**:
   - Get all commit messages: `git log origin/main..HEAD --pretty=format:"%s"`
   - Get detailed diff if needed: `git diff origin/main..HEAD --stat`
   - Understand the overall purpose of changes

6. **Create pr.md file**:
   - Follow the template structure (Summary, Why, Changes with AS-IS/TO-BE)
   - Write clear title (first line)
   - Write comprehensive description (rest of file)
   - Match the repository's PR language and style
   - Include all relevant context

7. **Show draft to user**:
   - Display the created `pr.md` content
   - Inform user they can edit `pr.md` before creating the PR
   - Suggest using `/create-pr` command next

## Important Notes

- **DO NOT create the actual PR** - only draft the content in pr.md
- Follow the repository's existing PR style and language
- Ensure pr.md follows the template format (Summary/Why/Changes)
- Make the description comprehensive but concise
