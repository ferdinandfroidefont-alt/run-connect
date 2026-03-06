

## Fix: Restrict Firebase duplicate check to Swift files only

### Root Cause

The `grep -rn "FirebaseApp.configure()" ios/App/App/` finds 2 matches:
1. `ios/App/App/AppDelegate.swift:15` — the real one
2. `ios/App/App/public/assets/index-CsjPWjHj.js:922` — the bundled web JS (contains the string in minified code)

### Changes

**Both files need the same fix**: add `--include="*.swift"` to the grep command.

#### 1. `scripts/configure_ios_push.sh` (line 38)

```bash
# Before:
TREE_MATCHES=$(grep -rn "FirebaseApp\.configure()" ios/App/App/ 2>/dev/null || true)

# After:
TREE_MATCHES=$(grep -rn --include="*.swift" "FirebaseApp\.configure()" ios/App/App/ 2>/dev/null || true)
```

#### 2. `.github/workflows/ios-appstore.yml` (line 101)

```bash
# Before:
FC_MATCHES=$(grep -rn "FirebaseApp\.configure()" ios/App/App/ 2>/dev/null || true)

# After:
FC_MATCHES=$(grep -rn --include="*.swift" "FirebaseApp\.configure()" ios/App/App/ 2>/dev/null || true)
```

No other changes needed. This ensures only Swift source files are scanned, ignoring the bundled web assets in `ios/App/App/public/`.

