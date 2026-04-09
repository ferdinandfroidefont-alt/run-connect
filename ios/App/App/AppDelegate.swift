import UIKit
import UserNotifications
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Set up UNUserNotificationCenter to display notifications while in foreground
        UNUserNotificationCenter.current().delegate = self

        if Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist") != nil {
            if FirebaseApp.app() == nil {
                FirebaseApp.configure()
            }
            Messaging.messaging().delegate = self
            print("[PUSH][IOS] Firebase configured, MessagingDelegate set")

            // Request notification authorization directly from native (belt-and-suspenders with Capacitor)
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
                print("[PUSH][IOS] UNUserNotificationCenter auth granted=\(granted) error=\(String(describing: error))")
                if granted {
                    DispatchQueue.main.async {
                        application.registerForRemoteNotifications()
                        print("[PUSH][IOS] registerForRemoteNotifications called after authorization")
                    }
                }
            }

            // Also register immediately (uses existing permission if already granted)
            application.registerForRemoteNotifications()
            print("[PUSH][IOS] registerForRemoteNotifications called at launch")

            // Try to get cached FCM token immediately
            Messaging.messaging().token { [weak self] token, error in
                if let error = error {
                    print("[PUSH][IOS] Launch FCM token fetch: \(error.localizedDescription)")
                    return
                }
                guard let token = token, !token.isEmpty else { return }
                print("[PUSH][IOS] Launch FCM token OK length=\(token.count)")
                UserDefaults.standard.set(token, forKey: "fcm_token")
                self?.injectFCMTokenIntoWebView(token, traceId: "launch")
            }
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
        // Re-inject FCM token into WebView every time the app resumes
        // (handles the case where injection failed on cold start because the WebView wasn't ready)
        if let cachedToken = UserDefaults.standard.string(forKey: "fcm_token"), !cachedToken.isEmpty {
            let traceId = String(Int(Date().timeIntervalSince1970 * 1000))
            print("[PUSH][IOS] applicationDidBecomeActive: re-injecting cached FCM token traceId=\(traceId)")
            injectFCMTokenIntoWebView(cachedToken, traceId: traceId)
        }
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
            window.fcmTokenPlatform = 'ios';
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

// MARK: - UNUserNotificationCenterDelegate (foreground notifications)

extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show banner + sound + badge even when the app is in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        // Let Capacitor handle the tap action
        completionHandler()
    }
}
