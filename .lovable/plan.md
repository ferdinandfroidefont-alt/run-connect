

## Fix: Remove Over-Aggressive Comment Filter in Step 4

### Root Cause

Step 2 confirms `FirebaseApp.configure()` exists exactly once in the target file. Step 4 then searches the same directory recursively but applies `grep -v "//.*FirebaseApp"` which strips out the valid match. This happens because either:
- macOS grep interprets the pattern differently on the `grep -rn` output line
- `cap sync` generates a file containing a commented `// FirebaseApp.configure()` reference, which is the ONLY match found, and gets filtered — leaving count at 0

### Fix

**File: `scripts/configure_ios_push.sh`** — Simplify Step 4 to just count raw occurrences without the fragile comment filter. The goal is detecting duplicate files, not filtering comments (Step 2 already validates the single file's content).

```bash
# ─── STEP 4: BLOCKING — check across ios/App/App/ for duplicates (excludes Pods) ───
TREE_MATCHES=$(grep -rn "FirebaseApp\.configure()" ios/App/App/ 2>/dev/null || true)
TREE_COUNT=0
if [ -n "$TREE_MATCHES" ]; then
  TREE_COUNT=$(echo "$TREE_MATCHES" | wc -l | tr -d ' ')
fi
if [ "$TREE_COUNT" -ne 1 ]; then
  echo "❌ FATAL: Found $TREE_COUNT occurrences of FirebaseApp.configure() across ios/App/App/ — expected exactly 1"
  echo "$TREE_MATCHES"
  exit 1
fi
echo "✅ FirebaseApp.configure() found exactly 1 time across ios/App/App/ tree"
```

Key changes:
- Remove the `grep -v "//.*FirebaseApp"` filter entirely — it's the cause of the false negative
- Use `FirebaseApp\.configure()` (escaped dot + parens) for a more precise match
- Keep `|| true` and `2>/dev/null` for pipefail safety

Also apply the same simplification to the matching step in **`.github/workflows/ios-appstore.yml`** (the BLOCKING verification step).

### Files to modify
| File | Change |
|---|---|
| `scripts/configure_ios_push.sh` | Remove comment filter from Step 4, use precise regex |
| `.github/workflows/ios-appstore.yml` | Same fix in the BLOCKING assertion step |

