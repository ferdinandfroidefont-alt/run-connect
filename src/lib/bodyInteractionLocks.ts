/**
 * Réinitialise des styles « verrouillés » que certains dialogs (Radix) peuvent laisser
 * sur `body` / `html` après fermeture anormale ou navigation — sinon l’écran peut rester
 * non cliquable ou provoquer des comportements bizarres sur la page suivante (ex. /auth).
 */
export function resetBodyInteractionLocks(): void {
  if (typeof document === 'undefined') return;

  const { body, documentElement: html } = document;

  // Forcer "auto" en inline écrase les verrous laissés par des overlays.
  body.style.pointerEvents = 'auto';
  html.style.pointerEvents = 'auto';

  // Certaines libs ajoutent des data-attributes ; on ne les supprime que s’ils sont connus vides
  body.removeAttribute('data-scroll-locked');
}
