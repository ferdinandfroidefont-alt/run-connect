
# Outil Createur -- Gestion des abonnements Premium

## Objectif
Creer un panneau d'administration reserve au createur (toi) permettant de rechercher n'importe quel utilisateur par nom/pseudo et de lui attribuer ou retirer un abonnement premium gratuit avec une duree personnalisee.

## Ce qui sera cree

### 1. Nouveau composant `AdminPremiumManager.tsx`
Un panneau complet style iOS avec :
- **Barre de recherche** en haut pour trouver n'importe quel utilisateur par username ou display_name
- **Resultats de recherche** avec avatar, nom, pseudo et badge premium actuel
- **Au clic sur un utilisateur** : un panneau de gestion s'ouvre avec :
  - Statut premium actuel (actif/inactif, date d'expiration)
  - **Selecteur de duree** : 1 semaine, 1 mois, 3 mois, 6 mois, 1 an, ou duree personnalisee
  - **Bouton "Offrir Premium"** pour activer l'abonnement gratuit
  - **Bouton "Retirer Premium"** pour desactiver immediatement
  - Historique des actions effectuees

### 2. Integration dans le profil
- Accessible uniquement quand `user.email === 'ferdinand.froidefont@gmail.com'` (meme logique que l'historique de connexion existant)
- Ajoute comme un nouvel element dans la page Profile (visible uniquement pour le createur sur son propre profil)
- Bouton "Gestion Premium" avec une icone couronne qui ouvre le panneau en plein ecran (Dialog)

## Fonctionnement technique

### Recherche d'utilisateurs
- Recherche dans la table `profiles` sur les champs `username` et `display_name` avec `ilike`
- Debounce de 300ms sur la saisie
- Affichage de l'avatar, nom, pseudo et statut premium

### Attribution/Retrait Premium
- **Attribuer** : Met a jour la table `subscribers` pour l'utilisateur cible :
  - `subscribed = true`
  - `subscription_status = 'active'`
  - `subscription_tier = 'creator_gift'` (pour differencier des abonnements payants)
  - `subscription_end` = date actuelle + duree choisie
  - Met aussi `is_premium = true` dans `profiles`
- **Retirer** : 
  - `subscribed = false`, `subscription_status = 'inactive'`
  - Met `is_premium = false` dans `profiles`

### Edge function `admin-manage-premium`
Comme les tables `subscribers` et `profiles` ont des RLS qui empechent un utilisateur de modifier les donnees d'un autre, une edge function avec le service_role key est necessaire pour :
- Verifier que l'appelant est bien le createur (email check)
- Effectuer l'upsert dans `subscribers`
- Mettre a jour `is_premium` dans `profiles`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/AdminPremiumManager.tsx` | Creer -- Panneau de gestion premium |
| `src/pages/Profile.tsx` | Modifier -- Ajouter le bouton d'acces au panneau (createur uniquement) |
| `supabase/functions/admin-manage-premium/index.ts` | Creer -- Edge function pour modifier les abonnements |
| `supabase/config.toml` | Modifier -- Ajouter la config de la nouvelle edge function |
