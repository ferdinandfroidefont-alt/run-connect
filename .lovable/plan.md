

## Regrouper les sections du profil dans un seul bloc iOS

### Objectif

Fusionner "Records personnels", "Voir ses seances et itineraires" et "Creer un parcours" dans le meme bloc que Classement / Points / Badges / Activites recentes (le composant `ProfileStatsGroup`).

### Modifications

#### Fichier : `src/pages/Profile.tsx`

1. **Supprimer le bloc "Records personnels" separe** (lignes 844-855) -- il sera passe en enfant du `ProfileStatsGroup`.

2. **Supprimer le bloc "Routes Section"** (lignes 904-931) -- les lignes "Voir ses seances" et "Creer un parcours" seront aussi passees en enfants du `ProfileStatsGroup`.

3. **Passer ces elements comme `children` du `ProfileStatsGroup`** pour les deux cas (profil propre et profil autre utilisateur) :

Pour le profil propre (`!isViewingOtherUser`) :
```tsx
<ProfileStatsGroup userId={user?.id || ''} onSettingsClick={...} onInfoClick={...}>
  {/* Records personnels */}
  <div className="h-px bg-border ml-[54px]" />
  <PersonalRecords records={{ ... }} />
  {/* Voir mes seances et itineraires */}
  <div className="h-px bg-border ml-[54px]" />
  <div onClick={() => navigate('/my-sessions')} className="...">...</div>
  {/* Creer un parcours */}
  <div className="h-px bg-border ml-[54px]" />
  <div onClick={() => navigate('/route-creation')} className="...">...</div>
</ProfileStatsGroup>
```

Pour le profil d'un autre utilisateur (`isViewingOtherUser`) :
```tsx
<ProfileStatsGroup userId={viewingUserId || ''}>
  {/* Records personnels */}
  <div className="h-px bg-border ml-[54px]" />
  <PersonalRecords records={{ ... }} />
  {/* Voir ses seances et itineraires */}
  <div className="h-px bg-border ml-[54px]" />
  <div onClick={() => navigate(`/my-sessions?user=${viewingUserId}`)} className="...">...</div>
</ProfileStatsGroup>
```

### Resultat

Toutes ces lignes apparaitront dans un seul bloc `bg-card rounded-[10px]`, avec des separateurs uniformes, exactement comme les lignes Classement / Points / Badges / Activites dans le `ProfileStatsGroup`.

