
# Plan : Debugging Connexion Google Mobile - Investigation approfondie

## Diagnostic Actuel

La fonction `firebase-auth` est maintenant deployee avec les headers CORS complets et repond correctement aux tests serveur. Les logs montrent que la fonction fonctionne.

L'erreur "edge function returned a non 2xx status code" peut venir de plusieurs sources :

1. **Cache WebView Android** - L'ancien code sans headers CORS est encore en cache
2. **Erreur cote client** - Le token Firebase n'est pas correctement recupere avant l'appel
3. **Probleme de timing** - La requete echoue avant d'envoyer le token

---

## Actions Recommandees

### Etape 1 : Forcer le nettoyage du cache WebView

Vous devez **desinstaller completement l'application** de votre telephone et la reinstaller pour vider le cache WebView.

### Etape 2 : Ajouter du debugging cote client

Je vais modifier le fichier `Auth.tsx` pour ajouter des logs detailles qui nous montreront exactement ou l'erreur se produit :

**Fichier : `src/pages/Auth.tsx` (lignes 133-176)**

```typescript
const handleGoogleAuth = async () => {
  try {
    setIsLoading(true);
    console.log('🔥 [GOOGLE AUTH] Starting...');
    
    const isNativeAvailable = await isNativeGoogleSignInAvailable();
    console.log('🔥 [GOOGLE AUTH] Native available:', isNativeAvailable);
    
    if (isNativeAvailable) {
      try {
        console.log('🔥 [GOOGLE AUTH] Calling googleSignIn()...');
        const result = await googleSignIn();
        console.log('🔥 [GOOGLE AUTH] Got result:', { 
          hasToken: !!result.idToken, 
          tokenLength: result.idToken?.length,
          email: result.email 
        });
        
        console.log('🔥 [GOOGLE AUTH] Calling firebase-auth edge function...');
        const { data, error } = await supabase.functions.invoke('firebase-auth', {
          body: { idToken: result.idToken }
        });
        
        console.log('🔥 [GOOGLE AUTH] Edge function response:', { data, error });
        
        if (error) {
          console.error('🔥 [GOOGLE AUTH] Edge function error:', error);
          throw error;
        }
        // ... reste du code
      } catch (nativeError: any) {
        console.error('🔥 [GOOGLE AUTH] Native error:', nativeError);
        toast({
          title: "Erreur Google Sign-In",
          description: nativeError.message || "Erreur lors de l'authentification",
          variant: "destructive"
        });
        return;
      }
    }
    // ...
  } catch (error: any) {
    console.error('🔥 [GOOGLE AUTH] Global error:', error);
    // ...
  }
};
```

### Etape 3 : Verifier le toast d'erreur exact

L'erreur actuelle est "edge function returned a non 2xx status code". Si le probleme persiste apres reinstallation, le message d'erreur detaille dans les logs nous dira exactement ce qui echoue.

---

## Resume des Modifications

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Ajouter des console.log detailles dans handleGoogleAuth |

---

## Instructions pour Tester

1. **Desinstallez l'application** de votre telephone Android
2. **Reinstallez-la** depuis le store ou reconstruisez l'APK
3. **Essayez de vous connecter avec Google**
4. **Si ca echoue encore**, ouvrez les outils de dev (si possible) ou relancez l'app et envoyez-moi le message d'erreur exact

La fonction edge est maintenant correctement deployee - le probleme est probablement un cache WebView cote mobile.
