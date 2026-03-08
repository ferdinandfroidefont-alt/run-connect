

# Fix: Capture full iOS build logs + defensive build fixes

## Problem
The "Build iOS archive" step output is truncated by GitHub Actions ("Cette étape a été tronquée en raison de sa taille importante"). We cannot see the actual compilation error.

## Solution (2 parts)

### 1. Capture full xcodebuild logs as downloadable artifact
Pipe `xcodebuild` output to a file, then upload it as a GitHub Actions artifact. This way you can always download and search the full log.

**Edit `.github/workflows/ios-appstore.yml`** — change the archive step (lines 303-317):
- Redirect output to `$RUNNER_TEMP/xcodebuild.log` via `tee`
- Add a new step after to upload `xcodebuild.log` as artifact (even on failure)
- Add defensive Xcode 16.2 build settings: `SWIFT_COMPILATION_MODE=wholemodule`, explicit `IPHONEOS_DEPLOYMENT_TARGET=16.0`

### 2. Add common Xcode 16.2 defensive flags
Known issues with Xcode 16.2 archive builds on CI:
- Add `ENABLE_USER_SCRIPT_SANDBOXING=NO` (CocoaPods scripts may fail)
- Add `BUILD_LIBRARY_FOR_DISTRIBUTION=NO` (prevents module interface issues)

### Files to edit
**`.github/workflows/ios-appstore.yml`**:
- Modify archive command to pipe to log file via `tee`
- Add build flags: `ENABLE_USER_SCRIPT_SANDBOXING=NO`, `IPHONEOS_DEPLOYMENT_TARGET=16.0`
- Add new step: upload `xcodebuild.log` artifact on failure (`if: failure()`)

This guarantees that even if the build fails again, you'll have the **complete log** to find the exact error.

