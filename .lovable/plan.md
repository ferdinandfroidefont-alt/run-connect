

## Probleme identifie

Quand le dialog s'ouvre, deux effets se declenchent simultanement :

1. **Effet ligne 100** : remet tout a zero (groupPlans, sentAt, etc.)
2. **Effet ligne 119** : `loadSentSessionsDefault()` se declenche aussi car il depend de `isOpen` — il recharge les seances deja envoyees et remet `sentAt` avec la date d'envoi precedente

Le reset est donc immediatement ecrase par le chargement automatique des seances envoyees.

## Solution

### 1. Ne plus charger automatiquement les seances envoyees a l'ouverture

**Fichier : `src/components/coaching/WeeklyPlanDialog.tsx`**

- **Ligne 119-123** : Supprimer ou conditionner l'effet `loadSentSessionsDefault` pour qu'il ne se declenche PAS a l'ouverture initiale, uniquement quand on change de semaine ou de groupe apres l'ouverture.
- Ajouter un flag `hasInitialized` (ref) qui passe a `true` apres le premier render avec `isOpen=true`, et ne charger les seances envoyees que sur les changements suivants (semaine/groupe).

### 2. Supprimer le badge "Envoye a telle heure" du hero card

- **Lignes 674-681** : Supprimer le bloc `sentAt &&` qui affiche le badge vert "Envoye le X a HH:mm". L'utilisateur ne souhaite pas voir cette information quand il revient faire un nouveau programme.

### 3. Garder le chargement sur changement de semaine/groupe

- Quand l'utilisateur change de semaine (chevrons) ou de groupe (barre de recherche), `loadSentSessionsDefault` continue de fonctionner normalement pour afficher les seances existantes de cette semaine/groupe.

### Detail technique

```text
Flux actuel :
  isOpen=true → reset() + loadSentSessions() → reset ecrase

Flux corrige :
  isOpen=true → reset() seulement (page vide)
  changement semaine/groupe → loadSentSessions() (charge les donnees)
```

Modification concrete :
- Ajouter `const isInitialOpen = useRef(true)` 
- Dans l'effet ligne 119 : skip si `isInitialOpen.current` est true, puis le mettre a false
- Dans l'effet ligne 100 : remettre `isInitialOpen.current = true` quand `!isOpen`
- Supprimer les lignes 674-681 (badge "Envoye le...")

