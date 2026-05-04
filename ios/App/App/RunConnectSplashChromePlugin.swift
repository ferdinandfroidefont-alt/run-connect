import Capacitor
import UIKit

@objc(RunConnectSplashChromePlugin)
final class RunConnectSplashChromePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "RunConnectSplashChromePlugin"
    let jsName = "RunConnectSplashChrome"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setLoadingPresentationActive", returnType: CAPPluginReturnPromise),
    ]

    @objc func setLoadingPresentationActive(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        DispatchQueue.main.async { [weak self] in
            RunConnectBridgeViewController.isLoadingPresentationActive = active
            if let vc = self?.bridge?.viewController {
                vc.setNeedsUpdateOfHomeIndicatorAutoHidden()
                vc.setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
            }
        }
        call.resolve()
    }
}
