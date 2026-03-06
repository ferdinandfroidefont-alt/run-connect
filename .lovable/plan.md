

## Fix: Eliminate `pipefail` Crash in `scripts/configure_ios_push.sh`

### Root Cause

The script uses `set -euo pipefail`. In Step 4, the pipeline:
```bash
TREE_COUNT=$(printf "%s\n" "$TREE_MATCHES" | grep -v "//.*FirebaseApp" | sed '/^$/d' | wc -l | tr -d ' ')
```
If `grep -v` encounters a state where it exits non-zero (e.g., empty input, or all lines filtered), `pipefail` causes the entire assignment to fail silently — the script exits before printing any error message.

This explains why CI shows steps 1-3 pass, then a bare `Error: Process completed with exit code 1.` with no step 4 message.

### Fix (2 files)

#### 1. `scripts/configure_ios_push.sh` — Rewrite Step 4 to avoid fragile pipeline

Replace the pipeline with a safe, sequential approach:

```bash
# ─── STEP 4: BLOCKING — check across ios/App/App/ for duplicates ───
TREE_MATCHES=$(grep -rn "FirebaseApp.configure" ios/App/App/ 2>/dev/null || true)
# Filter out commented lines safely (no pipefail risk)
TREE_FILTERED=$(echo "$TREE_MATCHES" | grep -v "^$" | grep -v "//.*FirebaseApp" || true)
TREE_COUNT=0
if [ -n "$TREE_FILTERED" ]; then
  TREE_COUNT=$(echo "$TREE_FILTERED" | wc -l | tr -d ' ')
fi
```

Key changes:
- Scope narrowed to `ios/App/App/` (app source only, excludes Pods)
- Every `grep` has `|| true` to prevent pipefail kills
- Count defaults to 0 if filtered result is empty
- `2>/dev/null` on initial grep to suppress permission errors

#### 2. `.github/workflows/ios-appstore.yml` — Fix the BLOCKING step (lines 96-120)

Same problem: line 101 uses `grep -rn "FirebaseApp.configure" ios/` which will scan Pods after `pod install`. Apply the same fix:
- Narrow scope to `ios/App/App/`
- Add `|| true` to all intermediate greps

### Summary of changes

| File | Change |
|---|---|
| `scripts/configure_ios_push.sh` | Rewrite step 4 pipeline to be pipefail-safe, scope to `ios/App/App/` |
| `.github/workflows/ios-appstore.yml` | Fix BLOCKING step grep scope to `ios/App/App/`, add `|| true` guards |

