

## Fix: Stabilite iOS (barre en haut) + Google Sign-In "Acces Bloque"

### Probleme 1 : Barre qui apparait en haut sur la page Auth et autres pages

La page Auth (`/auth`) et plusieurs autres pages autonomes (About, Terms, Privacy, PublicProfile, NotFound, DonationSuccess, DonationCanceled) utilisent encore `min-h-screen`, ce qui provoque l'effet de rebond elastique iOS et revele la barre du navigateur.

### Probleme 2 : Google Sign-In "Acces Bloque" sur iOS

L'erreur "Acces bloque - demande du projet 220304658307 ne respecte pas les regles" est un probleme de **configuration Google Cloud Console**, pas du code. Sur iOS, le flux utilise `InAppBrowser` qui ouvre la page OAuth Google -- mais Google bloque la requete car le projet n'a pas ete verifie ou les URIs de redirection ne sont pas correctement configurees pour iOS.

---

### Solution code : Corriger toutes les pages avec `min-h-screen`

| Fichier | Type | Correction |
|---------|------|------------|
| `src/pages/Auth.tsx` | Autonome | `min-h-screen` devient `fixed inset-0 flex flex-col pt-safe` + ScrollArea dans `flex-1` |
| `src/pages/About.tsx` | Autonome | `min-h-screen` devient `fixed inset-0 flex flex-col pt-safe` |
| `src/pages/Terms.tsx` | Autonome | `min-h-screen` devient `fixed inset-0 flex flex-col pt-safe` |
| `src/pages/Privacy.tsx` | Autonome | `min-h-screen` devient `fixed inset-0 flex flex-col pt-safe` |
| `src/pages/PublicProfile.tsx` | Autonome | `min-h-screen` devient `fixed inset-0 flex flex-col pt-safe` avec contenu `flex-1 overflow-y-auto` |
| `src/pages/NotFound.tsx` | Autonome | `min-h-screen` devient `fixed inset-0` |
| `src/pages/DonationSuccess.tsx` | Autonome | `min-h-screen` devient `fixed inset-0` |
| `src/pages/DonationCanceled.tsx` | Autonome | `min-h-screen` devient `fixed inset-0` |
| `src/pages/Index.tsx` (loading) | Dans Layout | `min-h-screen` devient `h-full` |

### Solution Google Sign-In iOS : Actions manuelles requises

L'erreur "Acces bloque" vient de la **Google Cloud Console**, pas du code. Voici les etapes :

1. Aller dans **Google Cloud Console** : https://console.cloud.google.com/apis/credentials?project=run-connect-55803
2. Aller dans **OAuth consent screen** (ecran de consentement)
3. Verifier que le statut de publication est **"En production"** (pas "En test")
   - Si c'est "En test", cliquer **"Publier l'application"**
   - En mode test, seuls les utilisateurs de test ajoutes manuellement peuvent se connecter
4. Verifier les **domaines autorises** :
   - `run-connect.lovable.app`
   - `dbptgehpknjsoisirviz.supabase.co` (domaine Supabase pour le callback OAuth)
5. Verifier les **URI de redirection** du client Web OAuth :
   - `https://dbptgehpknjsoisirviz.supabase.co/auth/v1/callback`

### Detail technique

**Auth.tsx** : Le conteneur principal passe de `min-h-screen bg-secondary flex flex-col bg-pattern` a `fixed inset-0 bg-secondary flex flex-col bg-pattern pt-safe`. Le header perd son `pt-safe` interne (deja sur le parent). La `ScrollArea` reste inchangee car elle gere deja le scroll interne correctement.

**Pages autonomes (About, Terms, Privacy)** : Meme pattern -- `fixed inset-0` remplace `min-h-screen`, le contenu scrollable utilise `flex-1 overflow-y-auto`.

**PublicProfile** : Les deux vues (loading et contenu) passent de `min-h-screen` a `fixed inset-0` avec scroll interne.

