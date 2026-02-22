

# Afficher la barre de navigation sur toutes les pages

## Ce qui sera fait

### 1. Ajouter la barre de navigation aux pages qui ne l'ont pas

Les pages suivantes ne sont pas enveloppees dans `<Layout>` (qui contient la barre de navigation). Elles seront mises dans `<Layout>` :

- `/search` (page Rechercher)
- `/route-create` et `/route-creation` (Creer un itineraire)
- `/confirm-presence` et `/confirm-presence/:sessionId` (Confirmer une seance)

**Fichier** : `src/App.tsx` -- envelopper ces routes dans `<Layout>...</Layout>`

### 2. Arreter de masquer la barre dans les dialogues

- **`src/components/SettingsDialog.tsx`** : Supprimer le `setHideBottomNav(open)` pour que la barre reste visible quand les parametres sont ouverts
- **`src/components/CreateClubDialogPremium.tsx`** : Supprimer le `setHideBottomNav(isOpen)` pour que la barre reste visible

### 3. Arreter de masquer la barre sur la carte en mode immersif

- **`src/components/InteractiveMap.tsx`** : Supprimer le `setHideBottomNav(next)` dans le toggle du mode immersif

### 4. Adapter la page Search

La page Search utilise actuellement un overlay `fixed inset-0` qui couvre tout l'ecran. Il faudra ajuster pour laisser l'espace a la barre de navigation en bas (remplacer `inset-0` par un padding-bottom ou ajuster la hauteur).

**Fichier** : `src/pages/Search.tsx` -- ajuster le conteneur pour ne pas couvrir la barre de navigation

## Pages exclues (barre masquee)

- Page de chargement (`LoadingScreen`)
- Page de connexion (`/auth`)

## Details techniques

- Dans `App.tsx`, 5 routes seront enveloppees dans `<Layout>` : `/search`, `/route-create`, `/route-creation`, `/confirm-presence`, `/confirm-presence/:sessionId`
- Dans `SettingsDialog.tsx`, supprimer les lignes 73-78 (useEffect avec setHideBottomNav) et l'import de useAppContext
- Dans `CreateClubDialogPremium.tsx`, supprimer les lignes 52-56 (useEffect avec setHideBottomNav) et l'import de useAppContext
- Dans `InteractiveMap.tsx`, supprimer le `setHideBottomNav(next)` dans toggleImmersiveMode (ligne 218) et le cleanup associe
- Dans `Search.tsx`, ajuster le conteneur `fixed inset-0` pour respecter le padding bottom de la navigation

