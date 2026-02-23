

## Diagnostic

La structure actuelle de la vue conversation (lignes 1659–2330) est :

```text
<div className="h-full bg-secondary">
  <div className="h-screen flex flex-col">     ← conteneur principal
    <div className="fixed top-0 ...">           ← header (fixed)
    <div className="pt-[76px] flex-1 overflow-y-auto"> ← messages
    <div className="sticky bottom-0 ...">       ← input
  </div>
</div>
```

**Problèmes identifiés :**

1. **`h-screen`** au lieu de `h-[100dvh]` — sur iOS, `100vh` inclut la barre d'adresse Safari, causant un overflow qui déplace les éléments quand le clavier apparaît.

2. **Le header est `fixed` mais le conteneur parent a `h-screen flex flex-col`** — quand le clavier iOS s'ouvre, le viewport change et le `fixed` se recalcule par rapport au visual viewport, pas au layout viewport. Le header peut être poussé hors écran.

3. **L'input est `sticky bottom-0`** à l'intérieur d'un flex container avec `overflow-y-auto` sur le sibling — `sticky` dans ce contexte ne gère pas correctement le clavier iOS.

4. **Pas de `safe-area-inset-top`** sur le header — sur les iPhone avec encoche/Dynamic Island, le header peut être sous la status bar.

## Solution

Restructurer le layout de la conversation pour un comportement natif iOS :

### Fichier : `src/pages/Messages.tsx`

**1. Conteneur principal** — Remplacer `h-screen` par `h-[100dvh]` et ajouter le padding safe area :

```tsx
<div className="max-w-md mx-auto w-full h-[100dvh] flex flex-col" 
     style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
```

**2. Header** — Changer de `fixed` à `flex-shrink-0` (non-scrollable, dans le flow) :

```tsx
<div className="shrink-0 bg-card border-b border-border/50 z-50">
```

Supprimer `fixed top-0 left-1/2 transform -translate-x-1/2 max-w-md w-full`.

**3. Zone messages** — Supprimer le `pt-[76px]` (plus nécessaire car le header n'est plus fixed) et garder `flex-1 overflow-y-auto min-h-0` :

```tsx
<div className="flex-1 overflow-y-auto min-h-0">
```

**4. Zone input** — Changer de `sticky bottom-0` à `shrink-0` (dans le flow flex, toujours en bas) :

```tsx
<div className="shrink-0 w-full px-2 py-1 bg-card border-t border-border/50 z-40"
     style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
```

### Résultat structurel

```text
<div h-[100dvh] flex flex-col padding-top=safe-area>
  <div shrink-0>           ← header (dans le flow, jamais scrollé)
  <div flex-1 overflow-y>  ← messages (seule zone scrollable)
  <div shrink-0>           ← input (dans le flow, poussé par le clavier)
</div>
```

Le header reste **toujours visible** car il est `shrink-0` dans un flex column. Seule la zone messages scroll. Le clavier iOS pousse l'input et compresse les messages, sans toucher au header.

