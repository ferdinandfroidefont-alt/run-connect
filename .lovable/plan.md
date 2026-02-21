

# Fix double barre et couleurs incorrectes

## Diagnostic

Le probleme est simple : le `body::after` (overlay Home Indicator) utilise `#1d283a` comme couleur, mais la Bottom Navigation utilise `bg-background` qui est `hsl(222, 47%, 11%)` -- une couleur differente. Resultat : deux bandes de couleurs differentes empilees = "double barre".

Sur la page conversation, la bottom nav est cachee (`hideBottomNav = true`), donc seul l'overlay doit etre visible avec la bonne couleur grise.

## Solution

### Fichier : `src/index.css`

**1) Changer le defaut de `body::after`** : remplacer `#1d283a` par la couleur exacte du background de la nav (`hsl(var(--background))`) pour que l'overlay se fonde parfaitement avec la bottom nav quand elle est visible.

**2) Mettre a jour les classes de page** :

| Page | Bottom nav visible ? | `--safe-bottom-bg` |
|------|---------------------|---------------------|
| Home | Oui | Ne pas overrider (defaut = background = meme couleur que la nav) |
| Default | Oui | Ne pas overrider |
| Search | Oui | `#465467` + pattern (specifique) |
| Conversation | Non (cachee) | `#465467` + pattern |
| Loading | Non | `#465467` + pattern |

**3) Meme logique pour le top** : garder `#1d283a` comme defaut pour `body::before` (ca matche le header).

Concretement dans le CSS :

- `body::after` : `background-color: var(--safe-bottom-bg, hsl(var(--background)))` au lieu de `var(--safe-bottom-bg, #1d283a)`
- `body.page-home` : retirer `--safe-bottom-bg` et `--safe-bottom-pattern` (le defaut suffit)
- `body.page-default` : retirer `--safe-bottom-bg` et `--safe-bottom-pattern` (le defaut suffit)
- `body.page-conversation` : garder `--safe-bottom-bg: #465467` + pattern
- `body.page-search` : garder `--safe-bottom-bg: #465467` + pattern
- `body.page-loading` : garder `--safe-bottom-bg: #465467` + pattern

Aucun autre fichier modifie. Aucun changement de taille/position.

