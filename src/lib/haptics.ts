/** Léger feedback tactile sur iOS (Capacitor) ; vibration courte sur navigateurs qui la supportent. */
export async function lightHaptic(): Promise<void> {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  }
}
