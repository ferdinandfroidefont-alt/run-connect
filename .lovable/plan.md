

# Fix iOS SIGABRT Crash — Firebase Double-Init (Definitive)

## Problem
Build 234 still crashes with `SIGABRT` at `+[FIRApp configure]` (FIRApp.m:110). The `DispatchQueue.main.async` fix didn't work because the async block runs during the same run loop drain, and `FirebaseApp.app()` returns nil even though another component (Capacitor plugin or Firebase pod internal) has already started initialization — causing a double-init NSException.

**Swift cannot catch NSExceptions** (`@try/@catch` is Objective-C only). The nil guard is unreliable due to Firebase internal state races.

## Solution: ObjC Crash Guard
Create a tiny Objective-C helper that wraps `FirebaseApp.configure()` in `@try/@catch`. This is the **only guaranteed way** to prevent SIGABRT from double-init in Swift/ObjC mixed projects.

### Files to create/edit

**1. `scripts/configure_ios_push.sh`** — Complete rewrite of the Firebase init injection:
- Create `ios/App/App/SafeFirebaseInit.h` + `SafeFirebaseInit.m` (ObjC wrapper with `@try/@catch`)
- Append import to existing `ios/App/App/App-Bridging-Header.h` (Capacitor provides this)
- Replace the injected Swift code: call `SafeFirebaseInit.configure()` instead of `FirebaseApp.configure()`
- Keep everything else (imports, MessagingDelegate, inject_ios_push.py call, assertions)

### ObjC Wrapper (created by script at build time)

```objc
// SafeFirebaseInit.h
#import <Foundation/Foundation.h>
@interface SafeFirebaseInit : NSObject
+ (BOOL)configure;
@end

// SafeFirebaseInit.m
#import "SafeFirebaseInit.h"
@import FirebaseCore;
@implementation SafeFirebaseInit
+ (BOOL)configure {
    @try {
        if (![FIRApp defaultApp]) {
            [FIRApp configure];
            NSLog(@"[PUSH][IOS] FirebaseApp.configure() SUCCESS");
            return YES;
        } else {
            NSLog(@"[PUSH][IOS] FirebaseApp already configured");
            return YES;
        }
    } @catch (NSException *e) {
        NSLog(@"[PUSH][IOS] FirebaseApp.configure() caught exception: %@", e.reason);
        return [FIRApp defaultApp] != nil;
    }
}
@end
```

### Injected Swift (replaces current DispatchQueue.main.async block)

```swift
// Synchronous, crash-safe Firebase init
let _ = SafeFirebaseInit.configure()
Messaging.messaging().delegate = self
print("[PUSH][IOS] MessagingDelegate set, traceId=boot")
```

No more `DispatchQueue.main.async` — runs synchronously in `didFinishLaunchingWithOptions` which is the recommended Firebase pattern, but now crash-safe.

### Files to edit
1. **`scripts/configure_ios_push.sh`** — add ObjC file creation + update injection block

