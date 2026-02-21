# Refonte des Safe Areas iOS : controle couleur haut et bas par page

## Contexte actuel

- Un seul overlay existe : `body::before` (haut / Status Bar), pilote par `--ios-top-color`.
- Aucun overlay bas (Home Indicator) -- il a ete supprime precedemment.
- La variable `--ios-top-color` est settee dans 3 endroits : `Layout.tsx`, `LoadingScreen.tsx`, `Search.tsx`.

## Approche

Remplacer le systeme actuel par **deux overlays CSS purs** pilotes par **4 variables CSS** (`--safe-top-bg`, `--safe-top-pattern`, `--safe-bottom-bg`, `--safe-bottom-pattern`), avec des valeurs par defaut et des classes de page appliquees dynamiquement.

---

## Fichier 1 : `src/index.css`

### Supprimer

- Le bloc `body::before` existant (lignes 441-453) dans `@supports (-webkit-touch-callout: none)`.

### Ajouter (dans le meme bloc `@supports`)

Deux nouveaux pseudo-elements et les classes de page :

```text
/* iOS Safe Area Overlays - couleur unie par defaut, pattern optionnel */
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top, 0px);
  background-color: var(--safe-top-bg, #1d283a);
  background-image: var(--safe-top-pattern, none);
  background-repeat: repeat;
  background-size: 256px 256px;
  z-index: 9999;
  pointer-events: none;
}

body::after {
  content: '';
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-bottom, 0px);
  background-color: var(--safe-bottom-bg, #1d283a);
  background-image: var(--safe-bottom-pattern, none);
  background-repeat: repeat;
  background-size: 256px 256px;
  z-index: 9999;
  pointer-events: none;
}
```

Puis les classes de page (en dehors du bloc `@supports`, pour que le JS puisse les appliquer) :

```text
/* Page-specific safe area colors */

/* A) Loading : haut ET bas = secondary + pattern */
body.page-loading {
  --safe-top-bg: hsl(var(--secondary));
  --safe-top-pattern: url('/patterns/sports-pattern.png');
  --safe-bottom-bg: hsl(var(--secondary));
  --safe-bottom-pattern: url('/patterns/sports-pattern.png');
}

/* B) Accueil : haut = card + pattern, bas = #1d283a */
body.page-home {
  --safe-top-bg: hsl(var(--card));
  --safe-top-pattern: url('/patterns/sports-pattern.png');
  --safe-bottom-bg: #1d283a;
  --safe-bottom-pattern: none;
}

/* C) Default : haut et bas = #1d283a, pas de pattern */
body.page-default {
  --safe-top-bg: #1d283a;
  --safe-top-pattern: none;
  --safe-bottom-bg: #1d283a;
  --safe-bottom-pattern: none;
}

/* D) Search : haut = #1d283a, bas = secondary + pattern */
body.page-search {
  --safe-top-bg: #1d283a;
  --safe-top-pattern: none;
  --safe-bottom-bg: hsl(var(--secondary));
  --safe-bottom-pattern: url('/patterns/sports-pattern.png');
}

/* E) Conversation : haut ET bas = secondary + pattern */
body.page-conversation {
  --safe-top-bg: hsl(var(--secondary));
  --safe-top-pattern: url('/patterns/sports-pattern.png');
  --safe-bottom-bg: hsl(var(--secondary));
  --safe-bottom-pattern: url('/patterns/sports-pattern.png');
}
```

---

## Fichier 2 : `src/components/Layout.tsx`

Remplacer le `useEffect` actuel (lignes 19-34) qui settait `--ios-top-color` par un nouveau qui applique une **classe sur le body** selon la route :

```text
useEffect(() => {
  const path = location.pathname;
  // Retirer toute classe page-* precedente
  document.body.classList.remove(
    'page-loading', 'page-home', 'page-default',
    'page-search', 'page-conversation'
  );

  if (path === '/') {
    document.body.classList.add('page-home');
  } else if (path === '/messages' && location.pathname.includes('/')) {
    // /messages/xxx = conversation ouverte
    document.body.classList.add('page-conversation');
  } else {
    document.body.classList.add('page-default');
  }

  return () => {
    document.body.classList.remove(
      'page-home', 'page-default', 'page-conversation'
    );
  };
}, [location.pathname]);
```

La logique exacte pour messages vs conversation :

- `/messages` (liste) -> `page-default`
- `/messages/xxx` (conversation ouverte) -> `page-conversation`

On verifiera le routing pour confirmer si les conversations sont sur `/messages/:id` ou gerees autrement.

---

## Fichier 3 : `src/components/LoadingScreen.tsx`

Remplacer le `useEffect` qui settait `--ios-top-color` (lignes 23-29) par :

```text
useEffect(() => {
  document.body.classList.add('page-loading');
  return () => {
    document.body.classList.remove('page-loading');
  };
}, []);
```

---

## Fichier 4 : `src/pages/Search.tsx`

Remplacer le `useEffect` qui settait `--ios-top-color` (lignes 49-55) par :

```text
useEffect(() => {
  document.body.classList.add('page-search');
  return () => {
    document.body.classList.remove('page-search');
  };
}, []);
```

---

## Recapitulatif du mapping


| Page          | Haut (Status Bar)   | Bas (Home Indicator) |
| ------------- | ------------------- | -------------------- |
| Loading       | secondary + pattern | secondary + pattern  |
| Accueil `/`   | card + pattern      | #1d283a uni          |
| Search        | #1d283a uni         | secondary + pattern  |
| Conversation  | secondary + pattern | secondary + pattern  |
| Toutes autres | #1d283a uni         | #1d283a uni          |


Avant d’appliquer, je veux juste 3 ajustements :

&nbsp;

1. La condition “conversation” dans Layout.tsx est incorrecte (path === '/messages' && includes('/') ne détecte pas /messages/:id).
  Remplacer par path.startsWith('/messages/') pour page-conversation, et garder /messages en page-default.
2. Éviter le conflit Loading vs Layout : LoadingScreen met page-loading mais Layout peut remettre page-default.
  Soit Layout ne touche pas aux classes si page-loading est présent, soit LoadingScreen enlève toutes les autres page-* avant d’ajouter page-loading.
3. Confirmer que l’asset '/patterns/sports-pattern.png' existe bien dans public/patterns/ (sinon adapter le chemin).

&nbsp;

&nbsp;

Si tu corriges ça, on applique.

## Ce qui ne change pas

- La Bottom Navigation reste identique (position, taille, style).
- Aucun composant n'est deplace.
- Le meme asset `sports-pattern.png` est utilise partout.
- Les overlays sont `pointer-events: none` et ne modifient pas le layout.
- &nbsp;