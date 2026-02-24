

# Fix : Le bouton Coach ouvre directement "Nouvelle séance" au lieu du calendrier

## Problème identifié

Dans `Messages.tsx` (lignes 2829-2831), quand l'utilisateur clique sur un club dans le `CoachAccessDialog`, le callback `onSelectClub` ouvre directement le `CreateCoachingSessionDialog` :

```typescript
onSelectClub={(clubId) => {
  setCoachClubId(clubId);
  setShowCoachCreate(true); // ← ouvre directement "Nouvelle séance"
}}
```

Le flow actuel saute complètement le `ClubInfoDialog` qui contient le `CoachingTab` avec le calendrier, les boutons "Plan", "Templates" et "Créer".

## Solution

Modifier le callback `onSelectClub` dans `Messages.tsx` pour qu'il ouvre le `ClubInfoDialog` (qui affiche l'onglet Entraînements par défaut) au lieu du `CreateCoachingSessionDialog`.

Concrètement : quand le coach sélectionne un club, on charge les données du club depuis Supabase (`conversations`) et on ouvre `ClubInfoDialog` avec ces données. L'utilisateur verra alors le calendrier hebdo, le bouton "Plan de semaine", etc.

## Changement technique

**Fichier : `src/pages/Messages.tsx`**

1. **Modifier le `onSelectClub`** (lignes 2829-2832) : au lieu de `setShowCoachCreate(true)`, charger les données du club et ouvrir `setShowGroupInfo(true)` avec `setGroupInfoData(clubData)`.

```typescript
onSelectClub={async (clubId) => {
  // Charger les données du club
  const { data: clubData } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", clubId)
    .single();
  
  if (clubData) {
    setGroupInfoData(clubData);
    setShowGroupInfo(true);  // ← ouvre le ClubInfoDialog avec calendrier coach
  }
}}
```

2. **Supprimer le bloc `CreateCoachingSessionDialog` standalone** (lignes 2836-2843) qui n'est plus nécessaire depuis cette entrée (il reste accessible via le `CoachingTab` à l'intérieur du `ClubInfoDialog`).

Un seul fichier modifié, ~10 lignes changées. Le coach verra désormais le calendrier avec les boutons "Plan", "Templates" et "Créer" quand il clique sur son club.

