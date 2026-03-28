import { isIosAppShell } from "@/lib/iosAppShell";

export type IosEmptyStateSpacingClasses = {
  shell: string;
  iconCircle: string;
  textBlock: string;
};

/**
 * Espacement des empty states (icône / titre / texte / CTA) : version plus compacte sur iOS
 * où la hauteur utile est moindre (safe areas + petit écran), sans modifier Android.
 */
export function getIosEmptyStateSpacing(): IosEmptyStateSpacingClasses {
  if (!isIosAppShell()) {
    return {
      shell: "flex flex-col items-center justify-center px-ios-6 py-[5rem] text-center",
      iconCircle: "mb-ios-6 p-ios-6 bg-secondary rounded-full",
      textBlock: "space-y-ios-2 mb-ios-6",
    };
  }
  return {
    shell:
      "flex flex-col items-center justify-start px-ios-6 pb-ios-4 pt-ios-3 text-center",
    iconCircle: "mb-ios-3 p-ios-4 bg-secondary rounded-full",
    textBlock: "space-y-ios-1 mb-ios-4",
  };
}
