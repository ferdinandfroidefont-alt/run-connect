
# Plan: Optimisation du Profil Personnel Style iOS Premium

## Analyse de la Situation Actuelle

Le profil (`Profile.tsx`) a déjà reçu quelques améliorations iOS, mais certains éléments peuvent encore être optimisés pour atteindre le niveau professionnel "Strava/Instagram/Garmin".

## Améliorations Proposées

### 1. Header du Profil - Plus Compact et Élégant

**Modifications:**
- Réduire la taille de l'avatar de 88px à 80px (standard iOS)
- Améliorer l'espacement vertical pour plus de densité
- Ajouter un effet subtil de halo/ombre sur l'avatar
- Badges de statut en ligne avec le nom (comme Instagram)

### 2. Section Stats - Style Instagram/Strava

**Améliorations:**
- Augmenter légèrement la taille des chiffres pour meilleure lisibilité
- Améliorer le contraste des labels
- Ajouter une animation hover/tap subtile

### 3. Reliability Badge - Intégration Plus Fluide

**Modifications:**
- Réduire la largeur maximale
- Intégrer dans le flux vertical de manière plus naturelle

### 4. Section Informations Personnelles - UX Améliorée

**Améliorations:**
- Icône et couleur cohérentes
- Transition fluide à l'ouverture du formulaire
- Meilleure organisation des champs

### 5. Sections Routes/Séances - Uniformisation

**Modifications:**
- Assurer la cohérence des icônes et couleurs
- Améliorer les séparateurs entre éléments

---

## Détails Techniques

### Fichier à modifier: `src/pages/Profile.tsx`

#### Changements dans le Profile Header (lignes ~596-724):

```tsx
{/* Profile Header - iOS Style Premium */}
<div className="flex flex-col items-center pt-4 pb-2">
  {/* Avatar with subtle shadow */}
  <div className="relative mb-3">
    <Avatar className="h-20 w-20 ring-[3px] ring-white shadow-lg">
      <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
      <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/40">
        {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
    {/* Camera button for edit mode */}
  </div>
  
  {/* Display Name - Primary */}
  <h2 className="text-[22px] font-bold text-foreground mb-0.5">
    {profile?.display_name || profile?.username}
  </h2>
  
  {/* Username - Secondary */}
  <p className="text-[14px] text-muted-foreground mb-2">
    @{profile?.username}
  </p>
  
  {/* Badges inline - More compact */}
  <div className="flex flex-wrap justify-center gap-1.5 mb-4">
    {/* Status badges */}
  </div>
  
  {/* Stats Row - Larger numbers */}
  <div className="flex items-center justify-center gap-8 py-3 w-full">
    <button className="text-center min-w-[60px]">
      <p className="text-[20px] font-bold text-foreground">{followerCount}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnés</p>
    </button>
    <div className="w-px h-8 bg-border/60" />
    <button className="text-center min-w-[60px]">
      <p className="text-[20px] font-bold text-foreground">{followingCount}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnements</p>
    </button>
    <div className="w-px h-8 bg-border/60" />
    <div className="text-center min-w-[60px]">
      <p className="text-[20px] font-bold text-foreground">{totalSessionsCreated}</p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Séances</p>
    </div>
  </div>
  
  {/* Reliability inline with stats */}
  <div className="w-full max-w-[160px] mt-2">
    <ReliabilityBadge rate={reliabilityRate} onClick={() => setShowReliabilityDetails(true)} />
  </div>
</div>
```

---

## Résumé des Changements

| Élément | Avant | Après |
|---------|-------|-------|
| Avatar | 88px, ring-2 | 80px, ring-[3px] + shadow-lg |
| Ordre Header | Username → Avatar → Name | Avatar → Name → @username |
| Stats chiffres | 18px | 20px |
| Stats labels | 12px lowercase | 11px uppercase tracking |
| Espacement | Gap-6 | Gap-8 avec séparateurs plus fins |
| Reliability | max-w-[180px] | max-w-[160px] |

## Sections Conservées (fin du fichier)

- ✅ `ProfileRankBadgeCompact` - Déjà optimisé
- ✅ Informations personnelles - Formulaire existant
- ✅ UserActivityChart
- ✅ StravaConnect
- ✅ Tous les dialogues (Follow, Settings, Report, Reliability, ImageCrop)
