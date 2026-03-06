#!/usr/bin/env python3
"""
Inject APNs + FCM + WebView bridge methods into AppDelegate.swift.
Fully instrumented with traceable logs for debugging.

Usage:
  python3 scripts/inject_ios_push.py --mode fresh
  python3 scripts/inject_ios_push.py --mode update
"""

import argparse
import re
import sys

DELEGATE_PATH = "ios/App/App/AppDelegate.swift"

SWIFT_METHODS = '''
    // MARK: - APNs Token Registration
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let hexToken = deviceToken.map { String(format: "%02x", $0) }.joined()
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] didRegisterForRemoteNotifications called traceId=\\(traceId)")
        print("[PUSH][IOS] APNs token hex length=\\(hexToken.count) prefix=\\(hexToken.prefix(16))...")

        // 1. Post raw Data to Capacitor (standard flow)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // 2. Give APNs token to Firebase for FCM exchange
        Messaging.messaging().apnsToken = deviceToken
        print("[PUSH][IOS] Messaging.apnsToken assigned")

        // 3. Fetch FCM token and inject into WebView
        Messaging.messaging().token { [weak self] fcmToken, error in
            if let error = error {
                print("[PUSH][IOS] FCM token fetch ERROR: \\(error.localizedDescription)")
                return
            }
            guard let fcmToken = fcmToken else {
                print("[PUSH][IOS] FCM token fetch returned nil")
                return
            }
            print("[PUSH][IOS] FCM token fetch SUCCESS length=\\(fcmToken.count) prefix=\\(fcmToken.prefix(20))...")
            self?.injectFCMTokenIntoWebView(fcmToken, traceId: traceId)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[PUSH][IOS] APNs registration FAILED: \\(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - MessagingDelegate (FCM token refresh)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else {
            print("[PUSH][IOS] messaging(didReceiveRegistrationToken) called with nil")
            return
        }
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] messaging(didReceiveRegistrationToken) length=\\(fcmToken.count) prefix=\\(fcmToken.prefix(20))... traceId=\\(traceId)")
        injectFCMTokenIntoWebView(fcmToken, traceId: traceId)
    }

    // MARK: - FCM Token WebView Bridge
    private func injectFCMTokenIntoWebView(_ token: String, traceId: String = "0") {
        print("[PUSH][IOS] injectFCMTokenIntoWebView called length=\\(token.count) traceId=\\(traceId)")

        func findBridge(from vc: UIViewController?) -> CAPBridgeViewController? {
            guard let vc = vc else { return nil }
            if let bridge = vc as? CAPBridgeViewController { return bridge }
            if let presented = vc.presentedViewController {
                if let found = findBridge(from: presented) { return found }
            }
            for child in vc.children {
                if let found = findBridge(from: child) { return found }
            }
            return nil
        }

        func inject(attempt: Int) {
            DispatchQueue.main.async {
                guard let window = UIApplication.shared.windows.first,
                      let rootVC = window.rootViewController else {
                    print("[PUSH][IOS] No rootViewController (attempt \\(attempt))")
                    return
                }
                if let bridge = findBridge(from: rootVC) {
                    let escapedToken = token.replacingOccurrences(of: "'", with: "\\\\'")
                    let js = """
                    window.fcmToken='\\(escapedToken)';
                    window.__fcmTraceId='\\(traceId)';
                    window.dispatchEvent(new CustomEvent('fcmTokenReady',{detail:{token:'\\(escapedToken)',platform:'ios',traceId:'\\(traceId)'}}));
                    console.log('[PUSH][IOS-BRIDGE] fcmTokenReady dispatched length='+\\(token.count)+' traceId=\\(traceId)');
                    """
                    bridge.webView?.evaluateJavaScript(js) { result, error in
                        if let error = error {
                            print("[PUSH][IOS] JS injection error (attempt \\(attempt)): \\(error.localizedDescription)")
                        } else {
                            print("[PUSH][IOS] WebView bridge dispatch SUCCESS attempt=\\(attempt) traceId=\\(traceId)")
                        }
                    }
                } else {
                    print("[PUSH][IOS] CAPBridgeViewController NOT FOUND attempt=\\(attempt)")
                    if attempt < 5 {
                        let delay = Double(attempt) * 2.0
                        print("[PUSH][IOS] Retrying in \\(delay)s...")
                        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                            inject(attempt: attempt + 1)
                        }
                    } else {
                        print("[PUSH][IOS] ❌ GAVE UP finding CAPBridgeViewController after 5 attempts")
                    }
                }
            }
        }

        inject(attempt: 1)
    }
'''


def inject_fresh():
    """First-time injection: add methods before the last closing brace."""
    with open(DELEGATE_PATH, 'r') as f:
        content = f.read()

    last_brace = content.rfind('}')
    if last_brace == -1:
        print("❌ Could not find closing brace in AppDelegate.swift")
        sys.exit(1)

    content = content[:last_brace] + SWIFT_METHODS + '\n' + content[last_brace:]

    with open(DELEGATE_PATH, 'w') as f:
        f.write(content)
    print("✅ APNs + FCM + WebView bridge methods injected (fresh)")


def inject_update():
    """Re-injection: remove old methods then inject new ones."""
    with open(DELEGATE_PATH, 'r') as f:
        content = f.read()

    # Remove existing push-related methods
    patterns = [
        r'    // MARK: - APNs Token Registration.*?(?=\n    // MARK: -|\n\})',
        r'    func application\(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken.*?^    \}',
        r'    func application\(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError.*?^    \}',
        r'    func messaging\(_ messaging: Messaging, didReceiveRegistrationToken.*?^    \}',
        r'    // MARK: - FCM Token WebView Bridge.*?(?=\n    // MARK: -|\n\})',
        r'    private func injectFCMTokenIntoWebView.*?^    \}',
    ]
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL | re.MULTILINE)

    # Clean up multiple blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    last_brace = content.rfind('}')
    if last_brace == -1:
        print("❌ Could not find closing brace in AppDelegate.swift")
        sys.exit(1)

    content = content[:last_brace] + SWIFT_METHODS + '\n' + content[last_brace:]

    with open(DELEGATE_PATH, 'w') as f:
        f.write(content)
    print("✅ WebView bridge re-injected (update)")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', required=True, choices=['fresh', 'update'])
    args = parser.parse_args()

    if args.mode == 'fresh':
        inject_fresh()
    else:
        inject_update()
