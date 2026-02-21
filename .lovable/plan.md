

# Supprimer la barre Home Indicator sur certaines pages

## Principe
On met `--ios-bottom-color` a `transparent` sur les pages demandees. Aucune barre n'est creee, aucune position ne change -- on rend juste le fond du Home Indicator invisible.

## Pages concernees et modifications

### 1. Page Classement (`/leaderboard`)
**Fichier : `src/components/Layout.tsx`**
- Ajouter une condition dans le `useEffect` existant : si `path === '/leaderboard'`, mettre `bottomColor = 'transparent'`.

### 2. Page Confirmer une seance (`/confirm-presence`)
**Fichier : `src/pages/ConfirmPresence.tsx`**
- Cette page n'est pas dans le Layout. Ajouter un `useEffect` qui set `--ios-bottom-color` a `transparent` (et cleanup au demontage).

### 3. Page Parametres et sous-pages
**Fichier : `src/components/SettingsDialog.tsx`**
- Ajouter un `useEffect` qui, quand le dialog est `open`, set `--ios-bottom-color` a `transparent`, et restaure la valeur precedente quand il se ferme.

### 4. Page Creer un club
**Fichier : `src/components/CreateClubDialogPremium.tsx`**
- Meme principe : `useEffect` quand le dialog est ouvert, `--ios-bottom-color` a `transparent`, restauration a la fermeture.

### 5. Page Nouveau message
**Fichier : `src/components/NewConversationView.tsx`**
- Ajouter un `useEffect` au montage qui set `--ios-bottom-color` a `transparent`, et restaure au demontage.

## Detail technique

Chaque `useEffect` suit ce schema :

```text
useEffect(() => {
  const prev = document.documentElement.style.getPropertyValue('--ios-bottom-color');
  document.documentElement.style.setProperty('--ios-bottom-color', 'transparent');
  return () => {
    document.documentElement.style.setProperty('--ios-bottom-color', prev);
  };
}, []);  // ou [open] pour les dialogs
```

Cela garantit que la valeur est restauree quand on quitte la page ou ferme le dialog.

