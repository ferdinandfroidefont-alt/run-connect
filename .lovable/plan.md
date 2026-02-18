

# Corriger le layout iOS -- Fix complet

## Probleme explique simplement

Sur Android, le navigateur gere bien les tailles d'ecran. Sur iPhone, le "notch" (encoche en haut) et la barre en bas (home indicator) creent des zones reservees. L'app essaie de les gerer a plusieurs endroits en meme temps, ce qui cause des conflits : elements qui se chevauchent, espaces doubles, contenu qui deborde.

## Corrections prevues

### 1. Supprimer `position: fixed` sur html/body (cause principale)

**Fichier : `src/index.css`**

Le CSS actuel pour mobile force `html` et `body` en `position: fixed` -- c'est une technique qui fonctionne sur Android mais qui casse completement le rendu sur iOS WebView (Capacitor). On remplace par une approche compatible iOS :

```css
@media screen and (max-width: 768px) {
  html, body {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    /* SUPPRIME: position: fixed; width: 100%; */
  }

  #root {
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
}
```

### 2. Definir la classe `glass-card` manquante

**Fichier : `src/index.css`**

Ajouter dans `@layer utilities` :

```css
.glass-card {
  background: hsl(var(--card) / 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--border) / 0.5);
}
```

### 3. Supprimer le double safe-area top dans Layout

**Fichier : `src/components/Layout.tsx`**

Retirer `pt-safe` du conteneur racine. Chaque page gere elle-meme son padding top (la carte a son propre `pt-safe` dans son header, les autres pages aussi). Layout ne doit gerer que la structure generale (hauteur + bottom padding pour la nav).

```tsx
// AVANT
<div className="h-screen-safe bg-background flex flex-col bg-pattern pt-safe">

// APRES
<div className="h-screen-safe bg-background flex flex-col bg-pattern">
```

### 4. Corriger la structure du Layout pour iOS

**Fichier : `src/components/Layout.tsx`**

Le `main` doit etre le seul element scrollable. La BottomNavigation est en `position: fixed`, donc on n'a besoin que du padding-bottom sur le main. On utilise `overflow-hidden` sur le root pour empecher le double scroll :

```tsx
return (
  <div className="h-screen-safe bg-background flex flex-col bg-pattern overflow-hidden">
    <main className={`flex-1 overflow-auto scroll-momentum ${hideBottomNav ? "" : "pb-[calc(72px+env(safe-area-inset-bottom,0px))]"}`}>
      <div className="animate-fade-in">
        {children}
      </div>
    </main>
    {!hideBottomNav && <BottomNavigation />}
  </div>
);
```

### 5. Corriger la hauteur de InteractiveMap

**Fichier : `src/components/InteractiveMap.tsx`**

La carte est un cas special : elle occupe tout l'ecran. Mais elle est DANS Layout, donc elle ne doit pas recalculer 100dvh elle-meme. Elle doit simplement remplir le conteneur parent :

```tsx
// AVANT : calcul independant qui entre en conflit avec Layout
<div style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}>

// APRES : remplit le parent (Layout gere deja la hauteur et le padding)
<div className="relative w-full h-full bg-background overflow-hidden">
```

### 6. Corriger la BottomNavigation

**Fichier : `src/components/BottomNavigation.tsx`**

La nav est correcte avec `pb-safe`, mais on s'assure que la hauteur totale (72px + safe area) est coherente :

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl pb-safe">
  <div className="h-px bg-border/50" />
  <div className="grid grid-cols-5 items-center h-[72px]">
    ...
  </div>
</nav>
```
(Pas de changement ici, c'est deja correct.)

### 7. Corriger les boutons flottants de la carte

**Fichier : `src/components/InteractiveMap.tsx`**

Les boutons en bas de la carte ne doivent plus utiliser `env(safe-area-inset-bottom)` car Layout + BottomNav gerent deja cet espace. Ils doivent simplement etre positionnes au-dessus de la zone de padding bottom :

```tsx
// AVANT
style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}

// APRES - simple bottom-4 suffit car le conteneur parent s'arrete avant la nav
className="absolute right-4 bottom-4 z-10 flex flex-col gap-2"
```

### 8. Ajouter padding top safe-area aux pages qui en ont besoin

**Fichier : `src/pages/MySessions.tsx`** et autres pages

Chaque page qui a un header doit ajouter `pt-safe` sur son propre header, pas sur Layout. Verifier que MySessions, Messages, Feed ont leur propre gestion du notch.

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/index.css` | Supprimer `position: fixed` sur html/body mobile + ajouter classe `glass-card` |
| `src/components/Layout.tsx` | Retirer `pt-safe`, ajouter `overflow-hidden` sur le root |
| `src/components/InteractiveMap.tsx` | Utiliser `h-full` au lieu de `calc(100dvh...)`, remettre `bottom-4` sur les boutons |
| `src/pages/MySessions.tsx` | Ajouter `pt-safe` si le header de la page ne l'a pas deja |

## Pourquoi Android ne sera pas impacte

- `env(safe-area-inset-*)` retourne `0px` sur Android (pas de notch iOS)
- `100dvh` fonctionne correctement sur Android
- Retirer `position: fixed` n'a aucun impact visible sur Android car le WebView Android gere deja bien le viewport
- La classe `glass-card` ajoute un style qui manquait partout, ce qui ameliore le rendu sur les deux plateformes

