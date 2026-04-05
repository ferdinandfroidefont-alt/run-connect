#!/usr/bin/env bash
set -euo pipefail

DELEGATE="ios/App/App/AppDelegate.swift"
INFO_PLIST="ios/App/App/Info.plist"
SAFE_INIT_H="ios/App/App/SafeFirebaseInit.h"
SAFE_INIT_M="ios/App/App/SafeFirebaseInit.m"
BRIDGING_HEADER="ios/App/App/App-Bridging-Header.h"

if [ ! -f "$DELEGATE" ]; then
  echo "⚠️ AppDelegate.swift not found at $DELEGATE"
  exit 0
fi

if grep -q 'RUNCONNECT_IOS_PUSH_COMPLETE' "$DELEGATE" 2>/dev/null; then
  echo "ℹ️ AppDelegate already ships FCM bridge (RUNCONNECT_IOS_PUSH_COMPLETE) — skipping configure_ios_push.sh"
  exit 0
fi

# ─── 1. Create ObjC Crash Guard (SafeFirebaseInit) ───
echo "🛡️ Creating SafeFirebaseInit ObjC crash guard..."

cat > "$SAFE_INIT_H" << 'OBJC_H_EOF'
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// ObjC wrapper that catches NSException from duplicate FirebaseApp.configure()
/// Swift cannot catch NSExceptions — this is the only safe way to prevent SIGABRT.
@interface SafeFirebaseInit : NSObject
+ (BOOL)configure;
@end

NS_ASSUME_NONNULL_END
OBJC_H_EOF
echo "✅ SafeFirebaseInit.h created"

cat > "$SAFE_INIT_M" << 'OBJC_M_EOF'
#import "SafeFirebaseInit.h"
#import <FirebaseCore/FirebaseCore.h>

@implementation SafeFirebaseInit

+ (BOOL)configure {
    @try {
        if (![FIRApp defaultApp]) {
            [FIRApp configure];
            NSLog(@"[PUSH][IOS] FirebaseApp.configure() SUCCESS via SafeFirebaseInit");
            return YES;
        } else {
            NSLog(@"[PUSH][IOS] FirebaseApp already configured (SafeFirebaseInit skipped)");
            return YES;
        }
    } @catch (NSException *exception) {
        NSLog(@"[PUSH][IOS] FirebaseApp.configure() CAUGHT EXCEPTION: %@ — reason: %@", exception.name, exception.reason);
        // Even if configure threw, check if Firebase ended up configured
        BOOL ok = [FIRApp defaultApp] != nil;
        NSLog(@"[PUSH][IOS] Post-exception FIRApp state: %@", ok ? @"CONFIGURED" : @"NOT CONFIGURED");
        return ok;
    }
}

@end
OBJC_M_EOF
echo "✅ SafeFirebaseInit.m created"

# ─── 2. Update Bridging Header ───
echo "🔗 Updating bridging header..."
if [ -f "$BRIDGING_HEADER" ]; then
  if ! grep -q "SafeFirebaseInit.h" "$BRIDGING_HEADER"; then
    echo '#import "SafeFirebaseInit.h"' >> "$BRIDGING_HEADER"
    echo "✅ SafeFirebaseInit.h added to bridging header"
  else
    echo "ℹ️ SafeFirebaseInit.h already in bridging header"
  fi
else
  cat > "$BRIDGING_HEADER" << 'BH_EOF'
//
//  App-Bridging-Header.h
//
#import "SafeFirebaseInit.h"
BH_EOF
  echo "✅ Bridging header created with SafeFirebaseInit.h"
fi

# ─── 3. Add SafeFirebaseInit.m to Xcode project ───
echo "📎 Adding SafeFirebaseInit.m to Xcode project..."
ruby << 'RUBY_SCRIPT'
require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |t| t.name == 'App' }

unless app_target
  puts "⚠️ App target not found, skipping xcodeproj integration"
  exit 0
end

# Find or create App group
app_group = project.main_group.find_subpath('App', false) || project.main_group

# Add SafeFirebaseInit.m if not already present
m_file = 'SafeFirebaseInit.m'
unless app_target.source_build_phase.files.any? { |f| f.file_ref&.path&.include?(m_file) }
  file_ref = app_group.new_file(m_file)
  app_target.source_build_phase.add_file_reference(file_ref)
  puts "✅ #{m_file} added to Xcode project compile sources"
else
  puts "ℹ️ #{m_file} already in compile sources"
end

# Add GoogleService-Info.plist to Copy Bundle Resources
plist_file = 'GoogleService-Info.plist'
unless app_target.resources_build_phase.files.any? { |f| f.file_ref&.path&.include?(plist_file) }
  plist_ref = app_group.new_file(plist_file)
  app_target.resources_build_phase.add_file_reference(plist_ref)
  puts "✅ #{plist_file} added to Copy Bundle Resources"
else
  puts "ℹ️ #{plist_file} already in Copy Bundle Resources"
end

# Ensure bridging header is set
app_target.build_configurations.each do |config|
  existing = config.build_settings['SWIFT_OBJC_BRIDGING_HEADER']
  unless existing && !existing.empty?
    config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] = 'App/App-Bridging-Header.h'
    puts "✅ Bridging header set for #{config.name}"
  end
end

project.save
puts "✅ Xcode project saved"
RUBY_SCRIPT

# ─── 4. Add Swift imports if missing ───
echo "📝 Configuring AppDelegate.swift imports..."

if ! grep -q "FirebaseCore" "$DELEGATE"; then
  sed -i '' 's/import UIKit/import UIKit\nimport FirebaseCore\nimport FirebaseMessaging\nimport Capacitor/' "$DELEGATE"
  echo "✅ Imports added"
fi

if ! grep -q "import Capacitor" "$DELEGATE"; then
  sed -i '' 's/import FirebaseMessaging/import FirebaseMessaging\nimport Capacitor/' "$DELEGATE"
  echo "✅ Capacitor import added"
fi

# ─── 5. Add MessagingDelegate conformance ───
if ! grep -q "MessagingDelegate" "$DELEGATE"; then
  sed -i '' 's/class AppDelegate: UIResponder, UIApplicationDelegate/class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate/' "$DELEGATE"
  echo "✅ MessagingDelegate conformance added"
fi

# ─── 6. Remove OLD Firebase init (DispatchQueue.main.async block + direct configure) ───
echo "🧹 Removing old Firebase init code..."
# Remove any previous DispatchQueue.main.async Firebase block
python3 -c "
import re
with open('$DELEGATE', 'r') as f:
    content = f.read()

# Remove DispatchQueue.main.async { ... FirebaseApp ... } blocks
content = re.sub(
    r'        DispatchQueue\.main\.async \{[^}]*FirebaseApp[^}]*Messaging\.messaging\(\)\.delegate[^}]*\}\s*',
    '',
    content,
    flags=re.DOTALL
)

# Remove any direct FirebaseApp.configure() calls (not in comments)
content = re.sub(r'^\s*(?:if FirebaseApp\.app\(\) == nil \{[^}]*\} else \{[^}]*\}|FirebaseApp\.configure\(\))\s*\n?', '', content, flags=re.MULTILINE | re.DOTALL)

# Remove stale print statements about boot traceId that were part of old injection
content = re.sub(r'^\s*print\(\"\[PUSH\]\[IOS\].*traceId=boot.*\"\)\s*\n', '', content, flags=re.MULTILINE)

with open('$DELEGATE', 'w') as f:
    f.write(content)
print('✅ Old Firebase init code removed')
"

# ─── 7. Inject crash-safe Firebase init (synchronous, ObjC guarded) ───
if ! grep -q "SafeFirebaseInit.configure()" "$DELEGATE"; then
  sed -i '' '/func application.*didFinishLaunchingWithOptions.*-> Bool {/a\
        // 🛡️ Crash-safe Firebase init (ObjC @try/@catch prevents SIGABRT on double-init)\
        let firebaseOk = SafeFirebaseInit.configure()\
        print("[PUSH][IOS] SafeFirebaseInit.configure() returned \\(firebaseOk) traceId=boot")\
        Messaging.messaging().delegate = self\
        print("[PUSH][IOS] MessagingDelegate set traceId=boot")
' "$DELEGATE"
  echo "✅ SafeFirebaseInit.configure() injected into didFinishLaunchingWithOptions"
else
  echo "ℹ️ SafeFirebaseInit.configure() already present"
fi

# ─── 8. HARD ASSERTION: SafeFirebaseInit MUST be present ───
if ! grep -q "SafeFirebaseInit.configure()" "$DELEGATE"; then
  echo "❌ FATAL: SafeFirebaseInit.configure() injection FAILED"
  cat "$DELEGATE"
  exit 1
fi
echo "✅ SafeFirebaseInit.configure() confirmed present"

if ! grep -q "Messaging.messaging().delegate = self" "$DELEGATE"; then
  echo "❌ FATAL: Messaging.messaging().delegate injection FAILED"
  cat "$DELEGATE"
  exit 1
fi
echo "✅ Messaging.messaging().delegate confirmed present"

# ─── 9. Inject APNs + FCM WebView bridge methods ───
python3 scripts/inject_ios_push.py --mode update

# ─── 10. STRICT POST-INJECTION ASSERTIONS ───
echo ""
echo "🔍 Verifying injected code..."

FAIL=0

if ! grep -q 'Messaging.messaging().apnsToken = deviceToken' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: Messaging.messaging().apnsToken = deviceToken NOT FOUND"
  FAIL=1
fi

if ! grep -q 'messaging(_ messaging: Messaging, didReceiveRegistrationToken' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: messaging(didReceiveRegistrationToken) NOT FOUND"
  FAIL=1
fi

if ! grep -q 'injectFCMTokenIntoWebView' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: injectFCMTokenIntoWebView NOT FOUND"
  FAIL=1
fi

if ! grep -q 'fcmTokenReady' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: fcmTokenReady event NOT FOUND"
  FAIL=1
fi

if ! grep -q 'PUSH.*IOS.*traceId' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: traceId logging NOT FOUND"
  FAIL=1
fi

# NEW: Verify NO direct FirebaseApp.configure() remains (only SafeFirebaseInit)
if grep -q 'FirebaseApp.configure()' "$DELEGATE"; then
  echo "❌ ASSERTION FAILED: Direct FirebaseApp.configure() still present (must use SafeFirebaseInit)"
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo ""
  echo "❌ BUILD FAILED: AppDelegate injection verification failed"
  echo "--- AppDelegate.swift content ---"
  cat "$DELEGATE"
  exit 1
fi

echo "✅ All assertions passed"

# ─── SHOW INJECTED CODE IN CI LOGS (proof) ───
echo ""
echo "📋 === AppDelegate.swift push-relevant excerpt ==="
grep -n -A2 'PUSH\|fcmToken\|apnsToken\|injectFCM\|didRegister\|MessagingDelegate\|FirebaseApp\|SafeFirebaseInit' "$DELEGATE" | head -80
echo "=== end excerpt ==="

# ─── VERIFY UIBackgroundModes ───
if [ -f "$INFO_PLIST" ]; then
  if ! plutil -p "$INFO_PLIST" | grep -q "remote-notification"; then
    echo "⚠️ Adding UIBackgroundModes remote-notification..."
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$INFO_PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string remote-notification" "$INFO_PLIST" 2>/dev/null || \
    echo "ℹ️ remote-notification may already exist in array"
  fi
  echo "✅ UIBackgroundModes verified"
fi

echo ""
echo "✅ Firebase crash guard + APNs + FCM WebView bridge configured (Build will NOT SIGABRT)"
