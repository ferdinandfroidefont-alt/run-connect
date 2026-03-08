

# Fix: SafeFirebaseInit.m path mismatch in Xcode project

## Root Cause

The Ruby script adds the file reference with path `App/SafeFirebaseInit.m` relative to the `App` group. Since the `App` group already resolves to `ios/App/App/`, Xcode looks for the file at `ios/App/App/App/SafeFirebaseInit.m` (triple `App`) -- but the script creates it at `ios/App/App/SafeFirebaseInit.m` (double `App`).

## Fix

In `scripts/configure_ios_push.sh` line 101, change:
```ruby
file_ref = app_group.new_file("App/#{m_file}")
```
to:
```ruby
file_ref = app_group.new_file(m_file)
```

This makes the file reference relative to the `App` group (which is already `ios/App/App/`), so Xcode will correctly resolve to `ios/App/App/SafeFirebaseInit.m`.

Same fix needed for the `.h` file if it's also referenced (though only `.m` is in compile sources, the bridging header import uses `#import "SafeFirebaseInit.h"` which resolves via header search paths, so it's fine).

### Files to edit
1. `scripts/configure_ios_push.sh` -- line 101: remove `"App/"` prefix

