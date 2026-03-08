

# Fix iOS Archive Build Failure

## Problem
The `xcodebuild archive` step fails during compilation. The most likely cause is `@import FirebaseCore;` in the generated `SafeFirebaseInit.m` file. The `@import` (module import) syntax can fail in certain Xcode/CocoaPods configurations where module maps aren't fully resolved during archive builds.

## Solution
Two changes in `scripts/configure_ios_push.sh`:

1. **Replace `@import FirebaseCore;` with `#import <FirebaseCore/FirebaseCore.h>`** in the generated `SafeFirebaseInit.m` — this is the traditional import that always works regardless of module settings.

2. **Add `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES`** to the `xcodebuild archive` command in `.github/workflows/ios-appstore.yml` as a safety net.

### Files to edit

**`scripts/configure_ios_push.sh`** (line 35):
- Change `@import FirebaseCore;` → `#import <FirebaseCore/FirebaseCore.h>`

**`.github/workflows/ios-appstore.yml`** (line 307-316):
- Add `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES` to `xcodebuild archive` flags

