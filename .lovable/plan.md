

## Diagnostic

D'après les screenshots iOS :

1. **ConsentDialog** : Le `DialogContent` utilise `max-w-2xl max-h-[90vh]` — sur iPhone, il ne prend pas le plein écran, le texte est tronqué horizontalement (titre "Consentement obligato..." coupé), et le contenu déborde. La `ScrollArea` a une hauteur fixe `h-[500px]` qui ne s'adapte pas.

2. **SettingsDialog — section partage de profil** : Le contenu (QR code, code parrainage, URL, boutons) déborde horizontalement sur petit écran. Le screenshot montre que les boutons et le code parrainage sont rognés à droite.

## Plan

### 1. ConsentDialog — Plein écran mobile

- Changer `DialogContent` : ajouter les classes mobile full-screen identiques au SettingsDialog (`w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] sm:w-auto sm:max-w-2xl sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-lg`)
- Changer `ScrollArea` de `h-[500px]` à `flex-1` pour occuper l'espace disponible dynamiquement
- Ajouter `overflow-hidden` sur le container principal

### 2. SettingsDialog — Contraindre la section partage

- Ajouter `overflow-x-hidden` sur le container de la section profil
- S'assurer que tous les éléments enfants respectent `max-w-full` et `min-w-0`

### Fichiers modifiés
- `src/components/ConsentDialog.tsx` — Layout plein écran mobile + ScrollArea flexible
- `src/components/SettingsDialog.tsx` — Contraintes overflow sur la section partage

