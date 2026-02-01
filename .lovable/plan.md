
# Plan : Correction Google Sign-In Mobile - Erreur Edge Function non-2xx

## Diagnostic

Le probleme vient des **headers CORS incomplets** dans la fonction edge `firebase-auth`. Le client Supabase JS envoie des headers supplementaires que la fonction n'autorise pas :

- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

Ces headers sont envoyes automatiquement par le SDK Supabase et doivent etre autorises dans la reponse CORS.

---

## Correction Requise

### Fichier : `supabase/functions/firebase-auth/index.ts`

**Avant (ligne 4-7) :**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Apres :**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}
```

---

## Pourquoi ca marche sur Web mais pas sur Mobile ?

1. **Web** : Le navigateur desktop peut avoir des regles CORS plus permissives ou le SDK utilise un chemin different
2. **Mobile (WebView Android)** : Le WebView applique strictement les regles CORS. Si un header envoye n'est pas dans `Access-Control-Allow-Headers`, la requete preflight `OPTIONS` echoue et la requete `POST` n'est jamais envoyee

---

## Verification Supplementaire

Je vais aussi verifier que la reponse OPTIONS retourne bien un status 200 (actuellement `null` comme body, ce qui est correct mais on peut l'ameliorer) :

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

Ceci est correct, mais on peut ajouter `'ok'` pour plus de compatibilite :

```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

---

## Resume des Modifications

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/firebase-auth/index.ts` | Ajouter les headers Supabase manquants dans `corsHeaders` |

Cette correction simple devrait resoudre l'erreur "edge function returned a non 2xx status code" sur mobile.
