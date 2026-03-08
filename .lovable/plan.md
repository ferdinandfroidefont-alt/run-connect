

# Fix: iOS build exit code swallowed by `tee` pipe

## Root Cause
In bash, `command | tee file` returns the exit code of `tee` (always 0), not `xcodebuild`. So when `xcodebuild archive` fails with a compilation error, the step still "passes." The next step (Export IPA) then fails with "archive not found."

The log artifact also never uploads because `if: failure()` checks the overall job status, which only fails at the export step — after the log was already needed.

## Fix
Add `set -o pipefail` to the archive step so the pipe returns xcodebuild's real exit code:

**Edit `.github/workflows/ios-appstore.yml`** line 304:
```yaml
      - name: 🏗️ Build iOS archive
        run: |
          set -o pipefail
          cd ios/App
          xcodebuild archive \
            ...
            2>&1 | tee "$RUNNER_TEMP/xcodebuild.log"
```

Also change the log upload condition from `if: failure()` to `if: always()` so the log is available even on success (useful for debugging warnings).

### Files to edit
1. `.github/workflows/ios-appstore.yml` — add `set -o pipefail` + change artifact upload to `if: always()`

