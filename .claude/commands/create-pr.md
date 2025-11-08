---
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(gh pr list:*), Bash(gh pr view:*), Read(pr.md)
argument-hint: [additional instructions]
description: Create or update PR from pr.md file
---

Create or update PR with the following additional instructions: $ARGUMENTS

## Context

- Current branch: `!git branch --show-current`
- Remote tracking: `!git status -sb`
- PR draft file exists: `!test -f pr.md && echo "Yes" || echo "No"`

## Your task

Create or update a GitHub pull request based on the content in `pr.md` file.

## Steps

1. **Verify prerequisites**:
   - Ensure `pr.md` file exists
   - If not, suggest running `/draft-pr` first
   - Check current branch is not main/master

2. **Verify branch is pushed**:
   - Check if current branch is pushed to remote
   - If not pushed: `git push -u origin $(git branch --show-current)`

3. **Check for existing PR**:
   - Check if PR already exists: `gh pr list --head $(git branch --show-current)`
   - Store PR number if exists

4. **Read pr.md content**:
   - Read the `pr.md` file
   - First line is the title
   - Remaining lines are the body

5. **Show PR content to user**:
   - Display the title and body from pr.md
   - If updating existing PR, show what will change
   - Ask for explicit user approval:
     - For new PR: "Would you like to create this PR? (You can edit pr.md first if needed)"
     - For update: "Would you like to update PR #XXX with this content? (You can edit pr.md first if needed)"

6. **Wait for user approval**:
   - MUST get explicit "yes" or confirmation from user
   - If user wants to edit, wait for them to finish

7. **Create or update PR** (only after approval):
   - If creating new PR:
     ```bash
     gh pr create --title "$(head -n1 pr.md)" --body "$(tail -n+2 pr.md)"
     ```
   - If updating existing PR:
     ```bash
     gh pr edit [PR_NUMBER] --title "$(head -n1 pr.md)" --body "$(tail -n+2 pr.md)"
     ```

8. **Show result**:
   - Display the PR URL
   - Confirm success

## Important Notes

- **NEVER create/update PR without explicit user approval**
- Always show what will be created/updated before proceeding
- Remind user they can edit pr.md before approval
- If pr.md doesn't exist, guide user to run `/draft-pr` first
- Ensure branch is pushed before creating PR
