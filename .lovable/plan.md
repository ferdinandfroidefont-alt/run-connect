
Objectif: corriger et instrumenter la chaîne iOS push (APNs → FCM → bridge WebView → save-push-token → profiles.push_token) pour identifier précisément l’étape cassée sur TestFlight.

1) Diagnostic des causes probables observées dans le code actuel
- `configure_ios_push.sh` ne force pas toujours la réinjection des méthodes push: si `injectFCMTokenIntoWebView` existe déjà, un ancien code peut rester en place.
- Le bridge iOS existe, mais il n’y a pas de preuve forte “build-time” que le code injecté final est bien celui compilé dans l’IPA.
- `saveTokenViaEdgeFunction` (front) n’envoie pas de `Authorization: Bearer ...` (pas de preuve JWT côté backend).
- `save-push-token` ne log pas assez (pas de trace d’entrée, pas d’info de rows touchées, pas de corrélation).
- Le hook n’expose pas un état debug structuré à l’UI; “Tester les notifications” ne donne pas toute la chaîne.

2) Modifications à implémenter (fichiers exacts)

A. iOS natif injecté (via CI)
- Fichier: `scripts/inject_ios_push.py`
  - Remplacer le bloc Swift injecté par une version “traceable”:
    - log au début de `didRegisterForRemoteNotificationsWithDeviceToken`
    - log APNs token (préfixe + longueur)
    - log après `Messaging.messaging().apnsToken = deviceToken`
    - log résultat de `Messaging.messaging().token(...)` (token ou erreur)
    - log dans `messaging(_:didReceiveRegistrationToken:)`
    - bridge dédié WebView via `window.dispatchEvent(new CustomEvent('fcmTokenReady', ...))`
  - Ajouter un `traceId` natif (timestamp) injecté dans l’event custom pour corréler avec logs front/backend.
  - Rendre la recherche `CAPBridgeViewController` robuste (navigation/presented/children + retry).

- Fichier: `scripts/configure_ios_push.sh`
  - Forcer la mise à jour des méthodes push à chaque build (appel systématique `--mode update`), pas seulement si bridge absent.
  - Ajouter vérifications strictes post-injection (`grep` obligatoire):
    - `Messaging.messaging().apnsToken = deviceToken`
    - `messaging(_:didReceiveRegistrationToken:)`
    - `injectFCMTokenIntoWebView`
  - Si une vérification échoue → `exit 1` (fail build).

B. Workflow iOS CI
- Fichier: `.github/workflows/ios-appstore.yml`
  - Après `configure_ios_push.sh`, ajouter étape “assertions”:
    - afficher extrait `AppDelegate.swift` dans les logs CI (preuve compile-time).
  - Durcir Google plist:
    - si secret `IOS_GOOGLE_SERVICE_INFO_BASE64` absent → fail explicite (pas “skipping”).
  - Ajouter/forcer `UIBackgroundModes` contient `remote-notification` dans `Info.plist`.
  - Conserver entitlements `aps-environment=production`.
  - Ajouter check final `PlistBuddy` pour prouver:
    - `FirebaseAppDelegateProxyEnabled = true`
    - `UIBackgroundModes` contient `remote-notification`.

C. Front hook instrumentation
- Fichier: `src/hooks/usePushNotifications.tsx`
  - Créer un état `pushDebug` structuré (et le retourner):
    - `permissionRequested`, `permissionResult`
    - `registerCalled`
    - `registrationEventReceived`
    - `apnsHexDetected`
    - `fcmTokenEventReceived`
    - `selectedFinalToken`
    - `saveAttempted` / `saveResponse`
    - `backendProfilePushToken`
    - `lastError`
    - `traceId`
  - Ajouter logs explicites à chaque étape avec même format `[PUSH][STEP]`.
  - Dans `registration` listener:
    - iOS + hex64 => marquer `apnsHexDetected=true`, ne pas sauvegarder.
  - Dans listener `fcmTokenReady`:
    - toujours traiter si token différent (retirer garde globale trop bloquante type `__fcmTokenReceived` stricte).
  - Dans `saveTokenViaEdgeFunction`:
    - inclure `Authorization` depuis `supabase.auth.getSession()`
    - inclure `x-push-trace-id`
    - logger request/response détaillés (status + body).
  - Après save réussi:
    - relire `profiles.push_token` et logger valeur/longueur.
  - Ajouter fallback retry clair si `fcmTokenReady` absent après N secondes post-register.

D. UI debug temporaire (visible dans l’app)
- Fichier: `src/components/settings/SettingsNotifications.tsx` (écran où est “Tester les notifications”)
  - Ajouter section “Debug iOS Push (temporaire)” affichant:
    - permission status
    - APNs reçu oui/non (hex64 détecté)
    - FCM reçu oui/non + longueur
    - token envoyé backend oui/non
    - réponse `save-push-token` (status/message)
    - `profiles.push_token` actuel (prefix + longueur)
    - `traceId`
  - Ajouter bouton “Actualiser état push backend” pour relire `profiles.push_token`.
  - Ajouter bouton “Copier diagnostic” (JSON debug) pour preuve reproductible.

E. Backend save token (preuves + robustesse)
- Fichier: `supabase/functions/save-push-token/index.ts`
  - Logger entrée complète avec `traceId`, `user_id` tronqué, `token.length`, `platform`.
  - Vérifier présence JWT:
    - parser `Authorization` (Bearer), valider `auth.getUser(token)`, logger résultat.
    - vérifier correspondance `authUser.id === user_id`; sinon 401/403 explicite.
  - Conserver rejet APNs hex64 pour iOS.
  - UPDATE avec retour contrôlé:
    - utiliser `.update(...).eq('user_id', user_id).select('user_id,push_token').maybeSingle()`
    - si aucun row -> 404 explicite “profile_not_found_or_not_updated”.
  - Réponse JSON détaillée:
    - `success`, `trace_id`, `updated`, `token_length`, `platform`, `user_id_prefix`.
  - Logs erreurs détaillées systématiques.

3) Logs attendus (preuve par étape)

Natif iOS attendu
- `[PUSH][IOS] didRegisterForRemoteNotifications called`
- `[PUSH][IOS] APNs token hex length=64 prefix=...`
- `[PUSH][IOS] Messaging.apnsToken assigned`
- `[PUSH][IOS] FCM token fetch success length=...` ou `...error=...`
- `[PUSH][IOS] messaging(didReceiveRegistrationToken) length=...`
- `[PUSH][IOS] WebView bridge dispatch fcmTokenReady traceId=...`

Front attendu
- `[PUSH][PERM] request -> granted/denied`
- `[PUSH][REGISTER] register() called`
- `[PUSH][EVENT] registration received length=64 (APNs hex) ignored`
- `[PUSH][EVENT] fcmTokenReady received length>50 traceId=...`
- `[PUSH][SAVE] calling save-push-token traceId=...`
- `[PUSH][SAVE] response status=200 body=...`
- `[PUSH][VERIFY] profiles.push_token length=...`

Backend attendu (`save-push-token`)
- `[SAVE-TOKEN][ENTRY] traceId=... user=... platform=ios token_length=...`
- `[SAVE-TOKEN][AUTH] jwt_present=true user_match=true`
- `[SAVE-TOKEN][UPDATE] updated=true`
- `[SAVE-TOKEN][SUCCESS] ...`

4) Tests iPhone TestFlight (checklist concret)
1. Ouvrir app fraîchement installée, accepter notifications.
2. Ouvrir “Notifications > Tester les notifications”.
3. Vérifier section debug:
   - permission `granted`
   - APNs reçu = oui
   - FCM reçu = oui (length > 50)
   - save backend = succès
   - profile token = non-null
4. Cliquer “Tester les notifications”:
   - réponse fonction indique `fcm_sent=true` (ou stage clair).
5. Mettre app en background, envoyer test:
   - bannière iOS reçue.
6. Capturer 3 preuves:
   - logs natifs (Xcode device logs ou Console.app)
   - logs WebView (Safari inspector)
   - logs edge function `save-push-token` avec même `traceId`.

5) Causes restantes si `profiles.push_token` reste null (après instrumentation)
- `didRegister...` jamais appelé: entitlement/provisioning/push capability runtime.
- APNs OK mais `Messaging.token(...)` en erreur: Firebase config/plist/project mismatch.
- FCM obtenu mais bridge WebView non exécuté: `CAPBridgeViewController` introuvable au bon moment.
- Front reçoit event mais save échoue: JWT absent/invalide, `user_id` mismatch, profile introuvable.
- Save réussit mais relire profil renvoie null: mauvais environnement Supabase/projet, mauvais user connecté, écrasement ultérieur par cleanup token invalide.

6) Livrables après implémentation
- A: patchs exacts des 5 fichiers ci-dessus.
- B: matrice “étape → log attendu”.
- C: protocole de test TestFlight en 6 étapes.
- D: tableau des causes résiduelles avec action corrective par cause.
