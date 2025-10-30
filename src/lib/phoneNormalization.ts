/**
 * Normalise un numéro de téléphone en plusieurs formats pour matching
 * @param phone - Numéro brut (06..., +33..., 33..., etc.)
 * @returns Array de variantes normalisées
 */
export const normalizePhoneVariants = (phone: string): string[] => {
  if (!phone) return [];
  
  // Nettoyer (supprimer espaces, tirets, parenthèses)
  const clean = phone.replace(/[\s\-\(\)\+]/g, '');
  
  const variants: string[] = [clean]; // Format brut nettoyé
  
  // Format international → local FR (33612345678 → 0612345678)
  if (clean.startsWith('33') && clean.length >= 11) {
    variants.push('0' + clean.substring(2));
  }
  
  // Format local FR → international (0612345678 → 33612345678)
  if (clean.startsWith('0') && clean.length === 10) {
    variants.push('33' + clean.substring(1));
  }
  
  // Format 9 chiffres → ajouter 0 (612345678 → 0612345678)
  if (clean.length === 9 && /^[1-9]/.test(clean)) {
    variants.push('0' + clean);
  }
  
  return [...new Set(variants)]; // Dédupliquer
};

/**
 * Normalise UN numéro pour stockage (préférer format FR local)
 */
export const normalizePhoneForStorage = (phone: string): string => {
  const variants = normalizePhoneVariants(phone);
  // Retourner format FR local si disponible (06...), sinon le premier
  return variants.find(v => v.startsWith('0') && v.length === 10) || variants[0];
};
