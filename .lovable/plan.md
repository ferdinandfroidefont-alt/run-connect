

## Plan : 2 corrections coaching

### 1. "Continuer le plan" pré-sélectionne l'athlète

**Problème** : Le bouton ouvre `WeeklyPlanDialog` vide sans contexte athlete.

**Fix** :
- **`WeeklyPlanDialog.tsx`** : Ajouter prop `initialAthleteName?: string`. Dans le `useEffect` d'ouverture, si `initialAthleteName` est fourni, chercher le membre correspondant dans `members` après chargement, et l'ajouter automatiquement à `targetAthletes`. Aussi pré-remplir le groupe de l'athlète dans `activeGroupId`.
- **`WeeklyTrackingDialog.tsx`** : Stocker le `selectedAthleteId` quand on clique "Continuer le plan", et passer le `selectedAthlete.displayName` + le `groupId` de l'athlète au `WeeklyPlanDialog` via les nouvelles props.
- **`WeeklyTrackingView.tsx`** : Modifier `onOpenPlanForAthlete` pour passer `(athleteId: string, athleteName: string, groupId?: string)` au lieu de juste le nom.

Ainsi à l'ouverture, le plan charge les séances existantes de la semaine pour le groupe de l'athlète, et l'athlète est déjà sélectionné comme cible.

### 2. Afficher le détail RCC dans les séances du suivi athlète

**Problème** : Les cartes de séance dans l'onglet "Séances" du suivi athlète n'affichent pas le code RCC (ex: `4x1000>3'15`).

**Fix dans `WeeklyTrackingView.tsx`** (section MODE DETAIL, lignes ~462-501) :
- Sous la ligne distance/pace, ajouter l'affichage de `dayData.session.rcc_code` quand il existe :
  ```
  {dayData.session.rcc_code && (
    <p className="text-[12px] font-mono text-muted-foreground mt-1">
      {dayData.session.rcc_code}
    </p>
  )}
  ```

