# RunConnect — légal, sécurité, règles produit, design & fonctionnalités

Ce document sert de **checklist** avant mise sur les stores et pour prioriser les évolutions.  
**Rien ici ne remplace un avocat / DPO** : faites valider CGU, politique de confidentialité et mentions légales.

---

## 1. Légal & conformité (RGPD, stores)

| Action | Détail |
|--------|--------|
| **Politique de confidentialité** | Page `src/pages/Privacy.tsx` — URL publique stable (même contenu que l’in-app) pour App Store / Play Console. |
| **CGU** | Page `src/pages/Terms.tsx` — même principe ; dates alignées via `src/lib/legalMeta.ts`. |
| **Consentement** | Champs `rgpd_accepted`, `security_rules_accepted` sur `profiles` + écran paramètres `SettingsPrivacy`. |
| **Droit à l’effacement** | Flux suppression de compte (edge function / support) — vérifier délais annoncés (ex. 30 jours) vs réalité ops. |
| **Sous-traitants** | Mentionner clairement Supabase, hébergeur, analytics (si activé), push (FCM), pub (AdMob) dans la politique. |
| **Mineurs** | Si l’app est 13+ / 16+ : l’indiquer dans CGU et fiches stores. |
| **Contact DPO / support** | `VITE_PUBLIC_SUPPORT_EMAIL` dans `.env` (voir `.env.example`) — utilisé par les pages légales. |
| **Mentions légales** | Page in-app **`/legal`** (`src/pages/LegalNotice.tsx`) + variables `VITE_PUBLIC_LEGAL_*` dans `.env.example`. Lien depuis Paramètres (Confidentialité, Aide), **À propos**, **Auth**. |

### À tenir à jour dans le code

- **`LEGAL_LAST_UPDATED_LABEL`** dans `src/lib/legalMeta.ts` à chaque révision juridique.
- **Même date** affichée sur Confidentialité + CGU.

---

## 2. Sécurité (appli + infra)

| Sujet | Recommandation |
|--------|----------------|
| **Secrets** | Jamais dans le repo : `.env` gitignored ; clés **anon** Supabase OK côté client, **service role** uniquement serveur (Edge Functions). |
| **RLS Supabase** | Toutes les tables exposées au client : politiques RLS testées (lecture/écriture par `user_id`). |
| **Auth** | Sessions Supabase ; pas de tokens custom en localStorage non chiffrés pour des secrets. |
| **Deep links OAuth** | Vérifier schémas `runconnect://` et domaines autorisés dans le dashboard Supabase. |
| **Dépendances** | `npm audit` / Dependabot ; mettre à jour vite, react, supabase-js régulièrement. |
| **Crash / erreurs** | Sentry (ou équivalent) avec **filtrage PII** ; ne pas logger emails / tokens. |
| **Headers HTTP** | En prod (CDN / hébergeur) : envisager CSP stricte, `X-Content-Type-Options`, HTTPS only. |
| **Signalement** | Fichier `SECURITY.md` à la racine : comment signaler une vuln (email dédié). |

---

## 3. Règles produit & communauté (stores + modération)

- **Contenu utilisateur** : modération décrite dans les CGU ; procédure de signalement (email support ou formulaire).
- **Activité physique** : clause type « consulter un médecin » (déjà esquissée dans les CGU) — à renforcer si coaching / défis extrêmes.
- **Strava / APIs tierces** : respecter leurs conditions ; indiquer la finalité dans la politique de confidentialité.

---

## 4. Design & UX (cohérence « Mes séances » / iOS)

| Principe | Référence dans le projet |
|----------|---------------------------|
| **Cartes & listes** | Utilitaires type `ios-card`, `ios-list-row`, `ios-list-stack` ; éviter `glass-card` sur les nouveaux écrans. |
| **Safe area** | `env(safe-area-inset-*)` pour headers fixes, bandeaux, bottom nav. |
| **Largeurs** | `min-w-0` sur flex/grid pour éviter le débordement horizontal (ex. dialogs, notifications). |
| **Thème** | `ThemeProvider` / next-themes ; barres système via `iosStatusBarTheme` / splash bleu unifié. |
| **Accessibilité** | Labels sur icônes seules, contrastes boutons primaires, tailles tactiles ≥ 44px où possible. |

---

## 5. Fonctionnalités — priorisation « qualité lancement »

1. **Parcours critique** : inscription → consentement → 1ère séance → message → retour arrière sans état cassé.  
2. **Hors ligne** : bandeau réseau + messages d’erreur explicites (pas de stack trace en prod).  
3. **Performances** : lazy routes, chunks Vite (voir `docs/LAUNCH_OPTIMIZATION.md`), images lourdes en `loading="lazy"`.  
4. **Analytics** : activer seulement avec bannière consentement si cookies / ID publicitaire (selon juridiction).  

---

## 6. Liens utiles

- `docs/LAUNCH_OPTIMIZATION.md` — perf, analytics stub, env.  
- `.cursor/rules/runconnect.mdc` — conventions code & légal pour l’IA / l’équipe.  
- `.env.example` — variables publiques recommandées.
