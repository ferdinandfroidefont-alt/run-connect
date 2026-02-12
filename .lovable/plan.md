

# Fix : Redirection bloquee apres creation de compte

## Probleme identifie

Apres avoir rempli le formulaire de creation de profil (`ProfileSetupDialog`), le profil est bien cree en base mais l'utilisateur reste bloque sur la page de creation. Le redirect vers `/` echoue silencieusement.

### Causes racines

1. **Chaos de redirections concurrentes** : `ProfileSetupDialog.handleSubmit()` (lignes 474-485) lance 6 tentatives de redirect (`href`, `replace`, `assign`) avec des `setTimeout` espaces de 100ms a 2s. Simultanement, le callback `onComplete` dans `Auth.tsx` (ligne 857) lance un 7eme redirect. Ces appels concurrents peuvent s'annuler ou creer des conditions de course.

2. **`signOut` avant `verifyOtp`** (ligne 316 de Auth.tsx) : Appeler `signOut({ scope: 'local' })` juste avant la verification OTP detruit la session locale. Si `verifyOtp` echoue silencieusement a re-persister la session (surtout avec le WebViewStorage custom), le redirect vers `/` echoue car `Layout.tsx` ne trouve pas de session et renvoie vers `/auth`.

3. **Race condition dialog/state** : `onOpenChange(false)` est appele en meme temps que `onComplete()` et les redirects. Le dialog peut se fermer avant que le redirect ne s'execute, ou React peut re-render et perdre le contexte.

## Solution

### Etape 1 : Supprimer le `signOut` avant `verifyOtp` dans Auth.tsx
Le nettoyage de session local avant verification OTP n'est pas necessaire et peut casser la persistence. La verification OTP cree elle-meme une nouvelle session propre.

**Fichier** : `src/pages/Auth.tsx` (lignes 314-316)
- Supprimer les 2 lignes `console.log` + `await supabase.auth.signOut({ scope: 'local' })` dans `handleOtpSubmit`

### Etape 2 : Simplifier la redirection dans ProfileSetupDialog
Remplacer les 6 tentatives de redirect (lignes 474-485) par un redirect unique et fiable. Si le premier echoue, utiliser un fallback a 500ms.

**Fichier** : `src/components/ProfileSetupDialog.tsx` (lignes 468-493)
```text
// AVANT : 6 redirects concurrents
redirectNow();
setTimeout(redirectNow, 100);
setTimeout(redirectNow, 300);
...

// APRES : un seul redirect propre
onOpenChange(false);
if (onComplete) onComplete();
// Le redirect est gere par onComplete dans Auth.tsx
```

### Etape 3 : Renforcer le callback onComplete dans Auth.tsx
Simplifier le callback pour faire un redirect unique et direct, sans setTimeout imbrique.

**Fichier** : `src/pages/Auth.tsx` (lignes 852-860)
```text
// AVANT
onComplete={() => {
  setShowProfileSetup(false);
  setTimeout(() => { window.location.href = '/'; }, 100);
}}

// APRES
onComplete={() => {
  setShowProfileSetup(false);
  window.location.href = '/';
}}
```

### Etape 4 : Ajouter un filet de securite dans le useEffect initial de Auth.tsx
Le useEffect existant (lignes 36-56) detecte deja `profileCreatedSuccessfully` en localStorage mais ne verifie pas la session. Ajouter une verification de session pour etre sur que le redirect peut fonctionner.

**Fichier** : `src/pages/Auth.tsx` (lignes 40-49)
- Ajouter un check `supabase.auth.getSession()` avant le redirect force
- Si pas de session mais profil cree, laisser l'utilisateur se reconnecter au lieu de boucler

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Supprimer signOut avant verifyOtp, simplifier onComplete callback, renforcer filet de securite |
| `src/components/ProfileSetupDialog.tsx` | Supprimer les 6 redirects concurrents, deleguer le redirect a onComplete |

## Ce qui ne change PAS
- La logique de creation de profil (insert/update + verification)
- Le upload d'avatar
- La persistence IndexedDB/sessionStorage pour Android
- La detection du flag `profileCreatedSuccessfully` en localStorage

