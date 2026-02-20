# Masquer la barre de navigation sur certaines pages

## Situation actuelle

- **Classement (Leaderboard)** : la barre n'est pas masquée __à masquer
- **Profil (Profile)** : la barre est visible -- a masquer
- **Confirmer presence (ConfirmPresence)** : la barre est visible -- a masquer
- **Parametres (SettingsDialog)** : c'est un dialog plein ecran, la barre reste visible en dessous -- a masquer

## Modifications

### 1. `src/pages/Profile.tsx`

Ajouter le meme pattern que Leaderboard :

```tsx
const { setHideBottomNav } = useAppContext();

useEffect(() => {
  setHideBottomNav(true);
  return () => setHideBottomNav(false);
}, [setHideBottomNav]);
```

### 2. `src/pages/ConfirmPresence.tsx`

Meme ajout :

```tsx
const { setHideBottomNav } = useAppContext();

useEffect(() => {
  setHideBottomNav(true);
  return () => setHideBottomNav(false);
}, [setHideBottomNav]);
```

### 3. `src/components/SettingsDialog.tsx`

Masquer la barre quand le dialog est ouvert :

```tsx
const { setHideBottomNav } = useAppContext();

useEffect(() => {
  setHideBottomNav(open);
  return () => setHideBottomNav(false);
}, [open, setHideBottomNav]);
```

Chaque composant restaure la barre au demontage (cleanup du useEffect), donc la navigation reapparait normalement quand on quitte ces pages.