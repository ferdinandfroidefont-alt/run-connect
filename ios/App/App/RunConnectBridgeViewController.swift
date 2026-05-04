import UIKit
import Capacitor

/// Pont principal Capacitor : edge-to-edge pendant le splash (`LoadingScreen`).
final class RunConnectBridgeViewController: CAPBridgeViewController {
    /// Aligné sur le splash plein écran Web jusqu’à `RunConnectSplashChrome.setLoadingPresentationActive({ active: false })`.
    static var isLoadingPresentationActive = true

    override var prefersHomeIndicatorAutoHidden: Bool {
        Self.isLoadingPresentationActive
    }
}
