

## Plan: Ajouter les icônes aux cases "Sport favori" et "Pays"

### Problème
Les cases "Sport favori" et "Pays" dans la section INFORMATIONS du profil n'ont pas d'emoji/icône colorée à gauche, contrairement aux autres cases (Pseudo, Nom, Âge, Téléphone).

### Changement dans `src/components/ProfileDialog.tsx`

**Ligne 678-682** — Ajouter une icône au "Sport favori" :
- `icon={Footprints}` (ou icône sport)
- `iconBgColor="bg-orange-500"`
- `iconColor="text-white"`

**Ligne 683-688** — Ajouter une icône au "Pays" :
- `icon={Globe}` (icône globe/terre)
- `iconBgColor="bg-indigo-500"`
- `iconColor="text-white"`

Ajouter les imports `Footprints` et `Globe` depuis `lucide-react` si pas déjà importés.

### Résultat
Toutes les cases de la section INFORMATIONS auront le même style iOS grouped avec icône carrée colorée à gauche.

