
# Plan : Correction Google Sign-In Mobile - Erreur Captcha

## Probleme Identifie

Les logs de la fonction edge montrent clairement l'erreur :

```
AuthApiError: captcha verification process failed
```

Le probleme n'est PAS les headers CORS. Le projet Supabase a le **captcha active** pour les connexions par mot de passe. La fonction `firebase-auth` utilise `signInWithPassword` avec un client `anon` qui declenche la verification captcha - mais aucun token captcha n'est fourni.

## Cause Technique

Dans `supabase/functions/firebase-auth/index.ts` (lignes 164-174) :

```typescript
// Client ANON - declenche le captcha
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''  // <-- PROBLEME : client anon
);

const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
  email: tokenInfo.email,
  password: tempPassword,  // <-- Echoue car captcha requis
});
```

## Solution

Utiliser le client **service_role** (deja cree dans la fonction) pour generer les tokens de session directement via l'API Admin, sans passer par `signInWithPassword`.

Supabase permet de generer des sessions via `auth.admin.generateLink` ou en creant des tokens JWT manuellement. La meilleure approche est d'utiliser `auth.admin.generateLink` avec `type: 'magiclink'` puis d'echanger le lien contre une session.

**Alternative plus simple** : Utiliser `supabase.auth.admin.generateLink` pour creer un lien de connexion, puis extraire le token pour creer une session.

### Modification du fichier : `supabase/functions/firebase-auth/index.ts`

**Avant (lignes 164-179) :**
```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

console.log('[FIREBASE AUTH] Signing in with temporary password');
const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
  email: tokenInfo.email,
  password: tempPassword,
});
```

**Apres :**
```typescript
// Utiliser generateLink pour obtenir un token sans captcha
console.log('[FIREBASE AUTH] Generating magic link for session...');
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: tokenInfo.email,
  options: {
    redirectTo: Deno.env.get('SUPABASE_URL')
  }
});

if (linkError || !linkData) {
  console.error('[FIREBASE AUTH] Error generating link:', linkError);
  throw linkError || new Error('Failed to generate magic link');
}

// Extraire le token du lien et l'echanger contre une session
const url = new URL(linkData.properties.action_link);
const token_hash = url.searchParams.get('token_hash');
const type = url.searchParams.get('type');

if (!token_hash) {
  throw new Error('No token_hash in generated link');
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const { data: sessionData, error: sessionError } = await supabaseClient.auth.verifyOtp({
  token_hash,
  type: 'magiclink'
});

if (sessionError || !sessionData.session) {
  console.error('[FIREBASE AUTH] Error verifying OTP:', sessionError);
  throw sessionError || new Error('Failed to create session');
}

const signInData = sessionData;
```

## Resume des Modifications

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/firebase-auth/index.ts` | Remplacer `signInWithPassword` par `generateLink` + `verifyOtp` pour contourner le captcha |

## Pourquoi ca marche sur Web ?

Sur le web, la connexion Google utilise `signInWithOAuth` qui passe par le flow OAuth natif de Supabase - pas de captcha requis. Sur mobile, le flow passe par Firebase ID Token puis la fonction edge qui tente un `signInWithPassword` - ce qui declenche le captcha.

## Deploiement

Apres modification, la fonction sera automatiquement redeployee. Pas besoin de desinstaller/reinstaller l'app car le probleme etait cote serveur.
