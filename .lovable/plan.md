

# Suppression des derniers vestiges de barres systeme iOS

## Probleme
3 fichiers utilisent encore la classe `pt-safe` qui reserve un espace en haut pour la barre de statut iOS, ce qui contredit l'objectif d'affichage 100% bord a bord.

## Fichiers a modifier

### 1. `src/components/settings/SettingsGeneral.tsx` (ligne 70)
- Supprimer `pt-safe` de la classe du header

### 2. `src/components/CreateClubDialogPremium.tsx` (ligne 282)
- Supprimer `pt-safe` de la classe du header

### 3. `src/components/RouteEditDialog.tsx` (ligne 90)
- Supprimer `pt-safe` de la classe du header

## Resultat
Apres ces 3 corrections, il ne restera plus aucune reference aux barres systeme iOS dans toute l'application (ni `pt-safe`, ni `pb-safe`, ni `env(safe-area-inset-*)`, ni `theme-color`, ni `StatusBar`).

