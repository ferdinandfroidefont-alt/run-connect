import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

// RUNCONNECT_IOS_PUSH_COMPLETE — FCM + pont WebView `fcmTokenReady` (voir usePushNotifications.tsx)

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist") != nil {
            if FirebaseApp.app() == nil {
                FirebaseApp.configure()
            }
            Messaging.messaging().delegate = self
            print("[PUSH][IOS] Firebase configured, MessagingDelegate set")
        } else {
            print("[PUSH][IOS] Missing GoogleService-Info.plist — add from Firebase Console (bundle com.ferdi.runconnect)")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - APNs → Capacitor + Firebase Messaging

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] didRegisterForRemoteNotifications traceId=\(traceId)")

        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        guard FirebaseApp.app() != nil else { return }

        Messaging.messaging().apnsToken = deviceToken

        Messaging.messaging().token { [weak self] token, error in
            if let error = error {
                print("[PUSH][IOS] FCM token fetch error: \(error.localizedDescription)")
                return
            }
            guard let token = token, !token.isEmpty else {
                print("[PUSH][IOS] FCM token fetch returned empty")
                return
            }
            print("[PUSH][IOS] FCM token OK length=\(token.count) traceId=\(traceId)")
            UserDefaults.standard.set(token, forKey: "fcm_token")
            self?.injectFCMTokenIntoWebView(token, traceId: traceId)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[PUSH][IOS] didFailToRegisterForRemoteNotifications: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // MARK: - WebView bridge

    private func keyWindowRootVC() -> UIViewController? {
        if #available(iOS 13.0, *) {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let keyWindow = scenes.flatMap { $0.windows }.first { $0.isKeyWindow }
            return keyWindow?.rootViewController
        }
        return UIApplication.shared.windows.first?.rootViewController
    }

    private func findBridge(from vc: UIViewController?) -> CAPBridgeViewController? {
        guard let vc = vc else { return nil }
        if let bridge = vc as? CAPBridgeViewController { return bridge }
        if let presented = vc.presentedViewController, let found = findBridge(from: presented) { return found }
        for child in vc.children {
            if let found = findBridge(from: child) { return found }
        }
        return nil
    }

    private func injectFCMTokenIntoWebView(_ token: String, traceId: String) {
        let detail: [String: String] = [
            "token": token,
            "platform": "ios",
            "traceId": traceId,
        ]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: detail, options: []),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            print("[PUSH][IOS] injectFCMTokenIntoWebView: JSON encode failed")
            return
        }

        let js = """
        (function(){
          try {
            var d = \(jsonString);
            window.fcmToken = d.token;
            window.__fcmTraceId = d.traceId;
            window.__fcmTokenBuffer = d.token;
            window.dispatchEvent(new CustomEvent('fcmTokenReady', { detail: d }));
            console.log('[PUSH][IOS-BRIDGE] fcmTokenReady len=' + (d.token && d.token.length) + ' traceId=' + d.traceId);
          } catch (e) { console.error('[PUSH][IOS-BRIDGE]', e); }
        })();
        """

        func inject(attempt: Int) {
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                guard let rootVC = self.keyWindowRootVC() else {
                    if attempt < 8 {
                        let delay = min(Double(attempt), 4.0)
                        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                            inject(attempt: attempt + 1)
                        }
                    } else {
                        print("[PUSH][IOS] inject: no rootViewController after retries (token in UserDefaults)")
                    }
                    return
                }
                guard let bridge = self.findBridge(from: rootVC) else {
                    if attempt < 8 {
                        let delay = min(Double(attempt), 4.0)
                        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                            inject(attempt: attempt + 1)
                        }
                    } else {
                        print("[PUSH][IOS] inject: CAPBridgeViewController not found after retries")
                    }
                    return
                }
                bridge.webView?.evaluateJavaScript(js) { _, error in
                    if let error = error {
                        print("[PUSH][IOS] evaluateJavaScript error (attempt \(attempt)): \(error.localizedDescription)")
                    } else {
                        print("[PUSH][IOS] WebView fcmTokenReady OK attempt=\(attempt) traceId=\(traceId)")
                    }
                }
            }
        }

        inject(attempt: 1)
    }
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken, !fcmToken.isEmpty else { return }
        let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
        print("[PUSH][IOS] didReceiveRegistrationToken length=\(fcmToken.count) traceId=\(traceId)")
        UserDefaults.standard.set(fcmToken, forKey: "fcm_token")
        injectFCMTokenIntoWebView(fcmToken, traceId: traceId)
    }
}
