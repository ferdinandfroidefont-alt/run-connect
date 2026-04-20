import Foundation
import Capacitor
import UIKit

/// Native Capacitor plugin for sharing to Instagram Stories via the official
/// "Sharing to Stories" API (instagram-stories:// URL scheme + UIPasteboard).
///
/// The `content_url` parameter adds a tappable attribution link at the bottom
/// of the Instagram story. The full-image-tap is NOT supported by Instagram
/// for third-party apps.
@objc(InstagramStoriesPlugin)
class InstagramStoriesPlugin: CAPPlugin, CAPBridgedPlugin {

    let identifier = "InstagramStoriesPlugin"
    let jsName = "InstagramStories"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareToStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "canShareToInstagram", returnType: CAPPluginReturnPromise)
    ]

    // MARK: – canShareToInstagram

    @objc func canShareToInstagram(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: "instagram-stories://share") else {
                call.resolve(["available": false])
                return
            }
            let available = UIApplication.shared.canOpenURL(url)
            call.resolve(["available": available])
        }
    }

    // MARK: – shareToStory

    @objc func shareToStory(_ call: CAPPluginCall) {
        guard let imageBase64 = call.getString("imageBase64"),
              let imageData = Data(base64Encoded: imageBase64) else {
            call.reject("Missing or invalid imageBase64")
            return
        }

        let contentUrl = call.getString("contentUrl") ?? ""
        let facebookAppId = call.getString("facebookAppId") ?? ""
        let topBgColor = call.getString("topBgColor") ?? "#FFFFFF"
        let bottomBgColor = call.getString("bottomBgColor") ?? "#FFFFFF"

        DispatchQueue.main.async {
            guard let url = URL(string: "instagram-stories://share"),
                  UIApplication.shared.canOpenURL(url) else {
                call.resolve(["success": false])
                return
            }

            var items: [String: Any] = [
                "com.instagram.sharedSticker.backgroundImage": imageData
            ]

            if !facebookAppId.isEmpty {
                items["com.instagram.sharedSticker.appID"] = facebookAppId
            }
            if !contentUrl.isEmpty {
                items["com.instagram.sharedSticker.contentURL"] = contentUrl
            }
            items["com.instagram.sharedSticker.backgroundTopColor"] = topBgColor
            items["com.instagram.sharedSticker.backgroundBottomColor"] = bottomBgColor

            let pasteboardOptions: [UIPasteboard.OptionsKey: Any] = [
                .expirationDate: Date().addingTimeInterval(300)
            ]
            UIPasteboard.general.setItems([items], options: pasteboardOptions)

            UIApplication.shared.open(url, options: [:]) { success in
                call.resolve(["success": success])
            }
        }
    }
}
