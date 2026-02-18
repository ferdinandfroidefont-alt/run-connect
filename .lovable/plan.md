
# Outil Createur complet -- Dashboard Admin & Support

## Objectif
Transformer le panneau "Createur" en un veritable outil d'administration avec toutes les fonctionnalites qu'un createur d'application et responsable support a besoin pour gerer ses utilisateurs et resoudre leurs problemes.

## Ce qui sera ajoute

Le composant `AdminPremiumManager.tsx` sera completement repense en un **dashboard createur multi-onglets** avec les sections suivantes :

### Onglet 1 : Gestion Premium (existant)
- Deja en place, recherche + attribution/retrait premium

### Onglet 2 : Fiche Utilisateur (nouveau)
Quand on selectionne un utilisateur, on voit sa **fiche complete** :
- **Infos profil** : nom, pseudo, email (recupere via edge function), date d'inscription, age, bio
- **Statut compte** : premium ou non, abonnement Stripe, tier, date d'expiration
- **Connexions** : Strava connecte, Instagram connecte
- **Statistiques** : sessions creees, sessions rejointes, taux de fiabilite, score, rang
- **Badges** : liste des badges debloques
- **Notifications** : push token present ou non, plateforme (iOS/Android/Web)
- **RGPD** : consentement accepte ou non

### Onglet 3 : Actions Support (nouveau)
Actions que le createur peut effectuer sur un utilisateur :
- **Reset du tutoriel** : remettre `tutorial_completed = false` et `onboarding_completed = false`
- **Reset mot de passe** : envoyer un email de reset via l'API Supabase Auth admin
- **Bannir/Debannir** : desactiver/reactiver le compte utilisateur
- **Supprimer le compte** : suppression complete (avec confirmation)
- **Modifier le profil** : changer le username, display_name, bio, avatar_url
- **Purger les notifications** : supprimer toutes les notifications de l'utilisateur
- **Reset du score/rang** : remettre les points a zero

### Onglet 4 : Statistiques globales (nouveau)
Vue d'ensemble de l'application :
- Nombre total d'utilisateurs
- Nombre d'utilisateurs premium
- Nombre de sessions creees (total + cette semaine)
- Nombre de messages envoyes
- Utilisateurs actifs recemment (derniers 7 jours)
- Nombre de clubs

### Onglet 5 : Signalements (nouveau)
- Liste des utilisateurs signales (via la table existante ou une nouvelle)
- Voir le motif du signalement
- Actions rapides : bannir, avertir, ignorer

## Modifications techniques

### 1. Edge Function `admin-manage-premium` -- etendre
Ajouter de nouvelles actions :
- `get_user_details` : recuperer email + infos completes (via auth.admin)
- `reset_tutorial` : mettre a jour `tutorial_completed` et `onboarding_completed`
- `reset_password` : envoyer un email de reset via `auth.admin.generateLink`
- `ban_user` : desactiver le compte via `auth.admin.updateUserById` (ban)
- `unban_user` : reactiver le compte
- `delete_user` : supprimer le compte via `auth.admin.deleteUser`
- `update_profile` : modifier les champs du profil
- `purge_notifications` : supprimer les notifications
- `reset_score` : remettre le score a zero
- `get_stats` : retourner les statistiques globales (counts)
- `get_reports` : recuperer les signalements

### 2. Composant `AdminPremiumManager.tsx` -- refonte complete
- Systeme d'onglets en haut (Tabs) : Premium | Fiche | Support | Stats | Signalements
- La barre de recherche reste commune aux onglets Premium, Fiche et Support
- L'onglet Stats et Signalements n'ont pas besoin de selectionner un utilisateur
- Style iOS coherent avec le reste de l'app

### 3. Aucune nouvelle table necessaire
Toutes les donnees sont deja disponibles dans les tables existantes (`profiles`, `subscribers`, `user_scores`, `user_stats`, `user_badges`, `notifications`, `sessions`, `messages`, `audit_log`). Les actions admin passent par l'edge function avec `service_role`.

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/AdminPremiumManager.tsx` | Refonte complete -- dashboard multi-onglets |
| `supabase/functions/admin-manage-premium/index.ts` | Etendre avec toutes les nouvelles actions admin |

## Securite
- Toutes les actions passent par l'edge function qui verifie que l'appelant est bien `ferdinand.froidefont@gmail.com`
- Le `service_role` key est utilise cote serveur uniquement
- Aucune donnee sensible n'est exposee cote client sans passer par l'edge function
