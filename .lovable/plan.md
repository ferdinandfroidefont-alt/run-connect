

# Rendre la barre de navigation visible partout

## Problemes identifies

Il y a **3 causes** qui empechent la barre de navigation d'apparaitre :

### 1. Messages : la barre est masquee dans les conversations
Dans `Messages.tsx`, quand une conversation est ouverte, `setHideBottomNav(true)` est appele (ligne 208). Cela cache la barre. De plus, la vue conversation utilise `h-screen` (100% de l'ecran) ce qui couvre tout.

### 2. SettingsDialog : le dialog couvre toute la page
Le `SettingsDialog` utilise un `Dialog` Radix avec un overlay `fixed inset-0 z-50`. La barre de navigation est aussi `z-50`, donc le dialog la recouvre completement.

### 3. Navigation `z-index` trop bas
La `BottomNavigation` a un `z-50`, identique aux overlays de dialogues. Les dialogues qui s'ouvrent apres (portals) passent visuellement devant la barre.

---

## Corrections prevues

### Fichier 1 : `src/components/BottomNavigation.tsx`
- Augmenter le `z-index` de `z-50` a `z-[100]` pour que la barre soit toujours au-dessus des dialogues et overlays

### Fichier 2 : `src/pages/Messages.tsx`
- **Supprimer** tout le `useEffect` qui appelle `setHideBottomNav` (lignes 206-221)
- **Supprimer** l'import de `setHideBottomNav` depuis `useAppContext`
- **Remplacer** `h-screen` par `h-full` dans le conteneur de conversation (ligne 1588) pour que la vue s'adapte a l'espace disponible dans Layout au lieu de prendre tout l'ecran
- Ajuster le header fixe de conversation pour ne pas etre cache par la barre

### Fichier 3 : `src/components/SettingsDialog.tsx`
- Ajouter `pb-[64px]` au `DialogContent` plein ecran pour laisser l'espace a la barre de navigation en bas

## Details techniques

- `BottomNavigation` : changer `z-50` en `z-[100]` sur la balise `<nav>`
- `Messages.tsx` : supprimer les lignes 206-221 (useEffect setHideBottomNav), retirer `setHideBottomNav` du destructuring de `useAppContext()`, remplacer `h-screen` par `h-full` ligne 1588
- `SettingsDialog.tsx` : ajouter `pb-[64px]` a la classe du `DialogContent` ligne 400

## Pages exclues

- Page de chargement (`LoadingScreen`)
- Page de connexion (`/auth`)

