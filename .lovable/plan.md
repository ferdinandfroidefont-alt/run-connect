

# Refonte page Auth RunConnect -- Style premium Komoot

## Architecture

Restructurer `src/pages/Auth.tsx` en 2 vues distinctes au sein du meme composant, controlees par un state `view`:

```text
view: 'landing' | 'email-signin' | 'email-signup' | 'otp' | 'reset'
```

**Landing** = page d'entree premium (3 boutons + legal)
**Email signin/signup** = bottom sheet ou sous-vue dediee
**OTP / Reset** = conserves tels quels

## Plan detaille

### 1. Fichier modifie : `src/pages/Auth.tsx`

**State** : remplacer `authStep` + `authMode` par un seul `view` state avec les 5 valeurs ci-dessus. Conserver tous les handlers existants sans modification (`handleGoogleAuth`, `handleEmailSubmit`, `handleOtpSubmit`, `handleUsernameOrEmailSignin`, `handlePasswordReset`, `resendOtp`, `forceCleanSession`).

**Vue Landing (view === 'landing')** :
- Fond blanc/gris tres clair avec un SVG decoratif subtil (courbe de parcours en filigrane, opacite ~5%)
- Safe area top respectee
- Bloc central verticalement centre :
  - Logo RunConnect (app-icon.png existant, 80px, rounded)
  - "RunConnect" en texte bold, bleu primaire
  - Slogan : "Chaque sortie commence ici." en gris doux
- 3 boutons empiles, largeur max ~340px, centres :
  - **Google** : fond blanc, border gris clair, logo FcGoogle, texte "Continuer avec Google" -- appelle `handleGoogleAuth()`
  - **Apple** : fond noir, texte blanc, icone Apple SVG inline -- appelle `supabase.auth.signInWithOAuth({ provider: 'apple', ... })` (nouveau flux, pattern identique au web Google OAuth)
  - **E-mail** : fond bleu primaire RunConnect, texte blanc, icone Mail -- navigate vers `view: 'email-signin'`
- Espacement genereux entre boutons (16px)
- Texte legal en bas : "En continuant, vous acceptez nos [Conditions] et notre [Politique de confidentialite]." avec liens vers `/terms` et `/privacy`
- Lien discret : "Deja inscrit ? Se connecter" (meme action que bouton email)

**Vue Email Signin (view === 'email-signin')** :
- Header avec bouton retour vers landing
- Titre "Connexion"
- 2 sous-sections dans une card :
  - **Connexion par mot de passe** : champs username/email + password + captcha + bouton "Se connecter" (reutilise `handleUsernameOrEmailSignin`)
  - **Connexion par code** : champ email + captcha + bouton "Recevoir un code" (reutilise `handleEmailSubmit` en mode signin)
- Lien "Mot de passe oublie" (reutilise la logique existante)
- Lien "Pas de compte ? Creer un compte" -> `view: 'email-signup'`
- Bouton "Nettoyer la session" discret en bas

**Vue Email Signup (view === 'email-signup')** :
- Header avec bouton retour
- Titre "Creer un compte"
- Champs email + password + captcha + referral code
- Bouton "Continuer" (reutilise `handleEmailSubmit` en mode signup)
- Lien "Deja inscrit ? Se connecter" -> `view: 'email-signin'`

**Vues OTP et Reset** : conservees quasi identiques, avec un bouton retour vers la vue precedente.

### 2. Bouton Apple Sign-In

Ajouter le handler Apple dans le meme fichier :
```ts
const handleAppleAuth = async () => {
  setIsLoading(true);
  try {
    await supabase.auth.signOut({ scope: 'local' });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { response_mode: 'form_post' }
      }
    });
    if (error) throw error;
  } catch (error: any) {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
  } finally {
    setIsLoading(false);
  }
};
```
Note : Apple Sign-In necessite une configuration dans le dashboard Supabase (provider Apple active). Le bouton sera present, le flux est pret. Si le provider n'est pas encore configure, l'erreur Supabase s'affichera proprement.

### 3. Design tokens

- Boutons hauteur 56px, border-radius 14px
- Font: texte 17px semibold pour les boutons
- Couleurs : blanc (#FFFFFF), noir (#000000), bleu primaire existant
- Ombres : `0 1px 3px rgba(0,0,0,0.08)`
- Fond page : `#F8F9FA` (gris tres clair chaud)
- SVG decoratif : un simple path SVG en absolute position, opacite 4%, bleu, evoquant une courbe de parcours

### 4. Ce qui ne change PAS

- Tous les handlers auth (Google native Android, iOS Safari bridge, web OAuth, OTP, password, reset)
- `ProfileSetupDialog` et sa logique
- Les imports et hooks existants
- Le `useEffect` d'initialisation (session check, referral, reset detection)
- Les callbacks, deep links, providers Supabase/Firebase
- `CaptchaWidget` -- deplace dans les vues secondaires uniquement
- `forceCleanSession` -- deplace dans les vues secondaires

### 5. Fichiers

Un seul fichier modifie : `src/pages/Auth.tsx` (refonte complete du JSX, conservation de toute la logique JS).

