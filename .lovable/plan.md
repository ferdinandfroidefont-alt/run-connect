

## Fix: Tree Grep Scope in `scripts/configure_ios_push.sh`

### Root Cause

Step 4 runs `grep -rn "FirebaseApp.configure" ios/` which searches the **entire** `ios/` directory — including `ios/Pods/` (installed CocoaPods). Firebase's own SDK source code contains multiple references to `FirebaseApp.configure`, so the count exceeds 1 and the assertion fails.

Steps 1-3 pass correctly (the versioned AppDelegate is fine). The crash fix itself is already correct — this is a CI script bug.

### Fix

**File: `scripts/configure_ios_push.sh`** — Line 38

Change the tree grep to only scan app source code (`ios/App/`), excluding Pods and build artifacts:

```bash
# Before (broken):
TREE_COUNT=$(grep -rn "FirebaseApp.configure" ios/ | grep -v "//.*FirebaseApp" | wc -l | tr -d ' ')

# After (fixed):
TREE_COUNT=$(grep -rn "FirebaseApp.configure" ios/App/ | grep -v "//.*FirebaseApp" | wc -l | tr -d ' ')
```

Update the error message on line 41 accordingly.

That's the only change needed. The versioned `AppDelegate.swift` and all other files are correct.

### Files to modify
- `scripts/configure_ios_push.sh` — Change `ios/` to `ios/App/` on lines 38 and 41

