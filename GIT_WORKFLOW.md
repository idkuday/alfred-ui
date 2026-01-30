# Git Workflow for Alfred UI

## Quick Commands

### Check Status
```bash
git status
```

### Stage Changes
```bash
git add .                    # Stage all changes
git add src/components/      # Stage specific directory
git add src/App.jsx          # Stage specific file
```

### Commit Changes
```bash
git commit -m "Description of changes"
```

### View History
```bash
git log --oneline           # Compact view
git log                     # Detailed view
git log -p                  # With diffs
```

### Undo Changes

#### Undo unstaged changes to a file
```bash
git checkout -- src/components/VoiceButton.jsx
```

#### Undo all unstaged changes
```bash
git checkout -- .
```

#### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

#### Undo last commit (discard changes)
```bash
git reset --hard HEAD~1
```

#### Revert to specific commit
```bash
git log --oneline           # Find commit hash
git reset --hard abc1234    # Revert to that commit
```

### View Diff
```bash
git diff                    # Unstaged changes
git diff --staged           # Staged changes
git diff HEAD~1             # Compare with last commit
```

---

## Recommended Workflow

1. **Before making changes:**
   ```bash
   git status              # Check current state
   ```

2. **Make your changes** in code

3. **Check what changed:**
   ```bash
   git status
   git diff
   ```

4. **Stage and commit:**
   ```bash
   git add .
   git commit -m "Clear description of what changed"
   ```

5. **If you need to undo:**
   ```bash
   git log --oneline       # See history
   git reset --hard HEAD~1 # Undo last commit
   ```

---

## Example Commit Messages

✅ **Good:**
- "Add auto-pause feature to voice input"
- "Fix transcription error with binary file handling"
- "Update ChatBox header styling"
- "Remove auto-pause, simplify VoiceButton"

❌ **Bad:**
- "changes"
- "fix"
- "update stuff"
- "wip"

---

## Emergency: Undo Everything

If things go wrong and you want to go back to last commit:

```bash
git reset --hard HEAD
git clean -fd              # Remove untracked files (be careful!)
```

---

**Last Updated:** 2026-01-29
