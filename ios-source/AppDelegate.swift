import UIKit
import FirebaseCore
import FirebaseMessaging
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Safe Firebase init — exactly ONE call, guarded
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            print("[PUSH][IOS] Firebase configured")
        } else {
            print("[PUSH][IOS] Firebase already configured, skipping")
        }

        Messaging.messaging().delegate = self
        print("[PUSH][IOS] MessagingDelegate set")

        return true
    }

    // MARK: - APNs Token Registration
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let hexToken = deviceToken.map { String(format: "%02x", $0) }.joined()
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] didRegisterForRemoteNotifications called traceId=\(traceId)")
        print("[PUSH][IOS] APNs token hex length=\(hexToken.count) prefix=\(hexToken.prefix(16))...")

        // 1. Post raw Data to Capacitor (standard flow)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // 2. Give APNs token to Firebase for FCM exchange
        Messaging.messaging().apnsToken = deviceToken
        print("[PUSH][IOS] Messaging.apnsToken assigned")

        // 3. Fetch FCM token and inject into WebView
        Messaging.messaging().token { [weak self] fcmToken, error in
            if let error = error {
                print("[PUSH][IOS] FCM token fetch ERROR: \(error.localizedDescription)")
                return
            }
            guard let fcmToken = fcmToken else {
                print("[PUSH][IOS] FCM token fetch returned nil")
                return
            }
            print("[PUSH][IOS] FCM token fetch SUCCESS length=\(fcmToken.count) prefix=\(fcmToken.prefix(20))...")
            self?.injectFCMTokenIntoWebView(fcmToken, traceId: traceId)
        }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[PUSH][IOS] APNs registration FAILED: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - MessagingDelegate (FCM token refresh)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else {
            print("[PUSH][IOS] messaging(didReceiveRegistrationToken) called with nil")
            return
        }
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] messaging(didReceiveRegistrationToken) length=\(fcmToken.count) prefix=\(fcmToken.prefix(20))... traceId=\(traceId)")
        injectFCMTokenIntoWebView(fcmToken, traceId: traceId)
    }

    // MARK: - FCM Token WebView Bridge
    private func injectFCMTokenIntoWebView(_ token: String, traceId: String = "0") {
        print("[PUSH][IOS] injectFCMTokenIntoWebView called length=\(token.count) traceId=\(traceId)")

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
                    print("[PUSH][IOS] No rootViewController (attempt \(attempt))")
                    return
                }
                if let bridge = findBridge(from: rootVC) {
                    let escapedToken = token.replacingOccurrences(of: "'", with: "\\'")
                    let js = """
                    window.fcmToken='\(escapedToken)';
                    window.__fcmTraceId='\(traceId)';
                    window.dispatchEvent(new CustomEvent('fcmTokenReady',{detail:{token:'\(escapedToken)',platform:'ios',traceId:'\(traceId)'}}));
                    console.log('[PUSH][IOS-BRIDGE] fcmTokenReady dispatched length='+\(token.count)+' traceId=\(traceId)');
                    """
                    bridge.webView?.evaluateJavaScript(js) { result, error in
                        if let error = error {
                            print("[PUSH][IOS] JS injection error (attempt \(attempt)): \(error.localizedDescription)")
                        } else {
                            print("[PUSH][IOS] WebView bridge dispatch SUCCESS attempt=\(attempt) traceId=\(traceId)")
                        }
                    }
                } else {
                    print("[PUSH][IOS] CAPBridgeViewController NOT FOUND attempt=\(attempt)")
                    if attempt < 5 {
                        let delay = Double(attempt) * 2.0
                        print("[PUSH][IOS] Retrying in \(delay)s...")
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
}
