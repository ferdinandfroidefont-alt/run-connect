# Fix des 2 problemes : page-conversation + z-index double barre

## Probleme 1 : page-conversation depuis Messages.tsx

La variable `selectedConversation` dans `src/pages/Messages.tsx` (ligne 139) determine si une conversation est ouverte. Un `useEffect` existe deja (lignes 206-212) pour masquer la bottom nav.

### Modification : `src/pages/Messages.tsx`

Ajouter un `useEffect` qui bascule entre `page-conversation` et `page-default` selon `selectedConversation` :

```text
useEffect(() => {
  document.body.classList.remove('page-conversation', 'page-default');
  if (selectedConversation) {
    document.body.classList.add('page-conversation');
  } else {
    document.body.classList.add('page-default');
  }
  return () => {
    document.body.classList.remove('page-conversation', 'page-default');
  };
}, [selectedConversation]);
```

### Modification : `src/components/Layout.tsx`

Retirer la branche `startsWith('/messages/')` qui ne fonctionne jamais. La route `/messages` sera traitee comme `page-default` par Layout, puis Messages.tsx prendra le relais pour basculer en `page-conversation` quand une conversation est ouverte.

---

## Probleme 2 : z-index de body::after par-dessus la bottom nav

### Modification : `src/index.css`

- `body::before` et `body::after` : passer de `z-index: 9999` a `z-index: 40` (en dessous de la bottom nav).

### Modification : `src/components/BottomNavigation.tsx`

- La nav a deja `z-50` (= z-index 50 en Tailwind), donc elle sera naturellement au-dessus de z-index 40.
- Aucune modification necessaire sur BottomNavigation.

---

## Resume des fichiers modifies


| Fichier                     | Changement                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| `src/pages/Messages.tsx`    | Ajouter useEffect pour basculer page-conversation / page-default |
| `src/components/Layout.tsx` | Retirer la branche `startsWith('/messages/')`                    |
| `src/index.css`             | body::before et body::after : z-index 9999 -> 40                 |


Aucun fichier cree. Aucune modification de taille/position sur la bottom nav.

OK pour tes 2 correctifs (page-conversation via selectedConversation + z-index overlays sous la bottom nav).  
  
MAIS il reste le plus important : les couleurs.  
L’écran de chargement est devenu noir, donc hsl(var(--secondary)) / variables thème ne matchent pas le gris réel.  
  
=> Pour éviter un nouveau flop :  
1) Remplace les couleurs du loading et conversation par des HEX fixes identiques au background réel de ces pages (haut ET bas).  
2) Confirme que le pattern /patterns/sports-pattern.png est bien chargé (sinon fallback).  
3) Validation : donne-moi les valeurs HEX mesurées (color picker) :  
- safe-area-top (loading)  
- background loading  
- safe-area-bottom (loading)  
Elles doivent être strictement identiques.  
Même chose pour conversation.