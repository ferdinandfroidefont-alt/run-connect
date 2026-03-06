#!/usr/bin/env python3
"""
Inject APNs + FCM + WebView bridge methods into AppDelegate.swift.

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
        print("[PUSH] APNs deviceToken received (hex): \\(hexToken.prefix(20))...")

        // 1. Post raw Data to Capacitor (standard flow)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // 2. Give APNs token to Firebase for FCM exchange
        Messaging.messaging().apnsToken = deviceToken
        print("[PUSH] APNs token given to Firebase Messaging")

        // 3. Fetch FCM token and inject into WebView
        Messaging.messaging().token(completion: { [weak self] fcmToken, error in
            if let error = error {
                print("[PUSH] FCM token fetch error: \\(error.localizedDescription)")
                return
            }
            guard let fcmToken = fcmToken else {
                print("[PUSH] FCM token is nil after fetch")
                return
            }
            print("[PUSH] FCM token received: \\(fcmToken.prefix(30))...")
            self?.injectFCMTokenIntoWebView(fcmToken)
        })
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[PUSH] APNs registration FAILED: \\(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - MessagingDelegate (FCM token refresh)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        print("[PUSH] FCM token refreshed: \\(fcmToken.prefix(30))...")
        injectFCMTokenIntoWebView(fcmToken)
    }

    // MARK: - FCM Token WebView Bridge
    private func injectFCMTokenIntoWebView(_ token: String) {
        DispatchQueue.main.async {
            guard let window = UIApplication.shared.windows.first,
                  let rootVC = window.rootViewController else {
                print("[PUSH] No root view controller found")
                return
            }
            var vc: UIViewController? = rootVC
            while let current = vc {
                if let bridge = current as? CAPBridgeViewController {
                    let escapedToken = token.replacingOccurrences(of: "'", with: "\\\\'")
                    let js = "window.fcmToken='\\(escapedToken)';window.dispatchEvent(new CustomEvent('fcmTokenReady',{detail:{token:'\\(escapedToken)',platform:'ios'}}));console.log('[PUSH] fcmTokenReady dispatched from native, token length:',\\(token.count));"
                    bridge.webView?.evaluateJavaScript(js) { result, error in
                        if let error = error {
                            print("[PUSH] JS injection error: \\(error.localizedDescription)")
                        } else {
                            print("[PUSH] FCM token injected into WebView successfully")
                        }
                    }
                    return
                }
                if let presented = current.presentedViewController {
                    vc = presented
                } else if let first = current.children.first {
                    vc = first
                } else {
                    break
                }
            }
            print("[PUSH] CAPBridgeViewController not found, retrying in 2s...")
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                guard let window = UIApplication.shared.windows.first,
                      let rootVC = window.rootViewController else { return }
                var retryVC: UIViewController? = rootVC
                while let current = retryVC {
                    if let bridge = current as? CAPBridgeViewController {
                        let escapedToken = token.replacingOccurrences(of: "'", with: "\\\\'")
                        let js = "window.fcmToken='\\(escapedToken)';window.dispatchEvent(new CustomEvent('fcmTokenReady',{detail:{token:'\\(escapedToken)',platform:'ios'}}));console.log('[PUSH] fcmTokenReady dispatched (retry)');"
                        bridge.webView?.evaluateJavaScript(js)
                        print("[PUSH] FCM token injected on retry")
                        return
                    }
                    if let presented = current.presentedViewController {
                        retryVC = presented
                    } else if let first = current.children.first {
                        retryVC = first
                    } else {
                        break
                    }
                }
                print("[PUSH] CAPBridgeViewController still not found after retry")
            }
        }
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
