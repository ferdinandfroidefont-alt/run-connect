# 🔧 Correction Google Sign-In (Erreur SHA-1)

## ✅ Modifications Automatiques Effectuées

### 1. Synchronisation de `google-services.json`
- ✅ Copié `android-webview/app/google-services.json` → `android/app/google-services.json`
- Les deux dossiers utilisent maintenant la même configuration Firebase

### 2. Vérification du Web Client ID
- ✅ Le `strings.xml` utilise le bon Web Client ID (type 3)
- Client ID: `220304658307-u0l7i7hbsn4rd1ah8athg84tph0977km.apps.googleusercontent.com`

## 📋 Informations du Projet Firebase

### Project Info
- **Project ID**: `run-connect-55803`
- **Project Number**: `220304658307`
- **Package Name**: `app.runconnect`

### Clients OAuth Actuels dans google-services.json

#### 1️⃣ Client Android (Type 1) - Pour authentification native
```json
{
  "client_id": "220304658307-dhf5bgbrogt9cfhj7c6l6pden8ofdmd0.apps.googleusercontent.com",
  "client_type": 1,
  "android_info": {
    "package_name": "app.runconnect",
    "certificate_hash": "90d3d23a5661fc29c62379f1d3c100f2d4622216"
  }
}
```
**SHA-1 enregistré**: `90d3d23a5661fc29c62379f1d3c100f2d4622216`

#### 2️⃣ Client Web (Type 3) - Pour OAuth popup
```json
{
  "client_id": "220304658307-u0l7i7hbsn4rd1ah8athg84tph0977km.apps.googleusercontent.com",
  "client_type": 3
}
```
**Utilisé dans**: `android/app/src/main/res/values/strings.xml`

#### 3️⃣ Client iOS (Type 2)
```json
{
  "client_id": "220304658307-09olmceemr3n24upc57bhc6d0lgg0lbe.apps.googleusercontent.com",
  "client_type": 2,
  "ios_info": {
    "bundle_id": "app.runconnect"
  }
}
```

## 🛠️ Actions Manuelles Requises

### ÉTAPE 1 : Générer le SHA-1 de votre Certificat

#### Option A : Certificat de Débogage (pour tests)
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Option B : Certificat de Release (pour production)
```bash
keytool -list -v -keystore /chemin/vers/votre/keystore.jks -alias votre_alias
```

**Récupérez** :
- SHA-1 (exemple: `90:D3:D2:3A:56:61:FC:29:C6:23:79:F1:D3:C1:00:F2:D4:62:22:16`)
- SHA-256 (optionnel mais recommandé)

### ÉTAPE 2 : Nettoyer Firebase Console

1. **Ouvrir Firebase Console** : https://console.firebase.google.com/project/run-connect-55803/settings/general

2. **Aller dans les paramètres Android** :
   - Cliquez sur l'icône Android (`app.runconnect`)
   - Section "SHA certificate fingerprints"

3. **Vérifier les SHA-1 enregistrés** :
   - ✅ Garder uniquement le SHA-1 de votre certificat actuel
   - ❌ Supprimer tous les anciens SHA-1 (certificats expirés, tests, etc.)

4. **Ajouter votre SHA-1** (si absent) :
   - Cliquez sur "Add fingerprint"
   - Collez votre SHA-1 (format: `90:D3:D2:3A:...`)
   - Cliquez sur "Save"

### ÉTAPE 3 : Nettoyer Google Cloud Console

1. **Ouvrir Google Cloud Console** : https://console.cloud.google.com/apis/credentials?project=run-connect-55803

2. **Lister les OAuth 2.0 Client IDs** :
   - Vérifier tous les clients Android existants
   - Identifier les clients en double ou obsolètes

3. **Garder UNIQUEMENT** :
   ```
   ✅ Client Android : 220304658307-dhf5bgbrogt9cfhj7c6l6pden8ofdmd0.apps.googleusercontent.com
      - Package: app.runconnect
      - SHA-1: 90d3d23a5661fc29c62379f1d3c100f2d4622216 (ou votre SHA-1 actuel)
   
   ✅ Client Web : 220304658307-u0l7i7hbsn4rd1ah8athg84tph0977km.apps.googleusercontent.com
      - Type: Web application
   
   ✅ Client iOS : 220304658307-09olmceemr3n24upc57bhc6d0lgg0lbe.apps.googleusercontent.com (si vous utilisez iOS)
   ```

4. **Supprimer les clients en double** :
   - Cliquez sur l'icône de suppression (poubelle)
   - Confirmez la suppression

### ÉTAPE 4 : Mettre à Jour le Client Android (si SHA-1 différent)

Si votre SHA-1 actuel est **différent** de `90d3d23a5661fc29c62379f1d3c100f2d4622216` :

1. **Dans Google Cloud Console** :
   - Cliquez sur le client Android : `220304658307-dhf5bgbrogt9cfhj7c6l6pden8ofdmd0`
   - Dans "Restrictions" → "Android restrictions"
   - Vérifiez que le package est : `app.runconnect`
   - Mettez à jour le SHA-1 avec votre certificat actuel
   - Cliquez sur "Save"

2. **Télécharger le nouveau google-services.json** :
   - Retournez dans Firebase Console
   - Paramètres du projet → Général
   - Section Android (`app.runconnect`)
   - Cliquez sur "google-services.json" pour télécharger
   - **Remplacez** les deux fichiers :
     - `android-webview/app/google-services.json`
     - `android/app/google-services.json`

### ÉTAPE 5 : Vérifier la Configuration OAuth

1. **Dans Google Cloud Console** :
   - Aller dans "OAuth consent screen"
   - Vérifier que votre domaine est autorisé

2. **Domaines autorisés** :
   - `91401b07-9cff-4f05-94e7-3eb42a9b7a7a.lovableproject.com` (dev)
   - `run-connect.lovable.app` (production)
   - Tout autre domaine custom

### ÉTAPE 6 : Tester l'Authentification

1. **Désinstaller l'app** de votre appareil Android
2. **Nettoyer et rebuilder** :
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   # ou
   ./gradlew assembleRelease
   ```

3. **Réinstaller l'app**

4. **Tester Google Sign-In** :
   - Cliquer sur "Se connecter avec Google"
   - ✅ Devrait afficher la popup Google native
   - ✅ Devrait permettre de sélectionner un compte
   - ✅ Devrait se connecter sans erreur

## 🔍 Vérifications Post-Configuration

### Vérifier le SHA-1 dans Firebase
```bash
# 1. Générer votre SHA-1 actuel
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

# 2. Comparer avec Firebase Console
# Doit correspondre à l'un des SHA-1 enregistrés dans Firebase
```

### Vérifier les Clients OAuth
- Firebase Console → Paramètres → Android → SHA fingerprints
- Google Cloud Console → APIs & Services → Credentials
- Les deux doivent être synchronisés

### Vérifier les Logs Android
```bash
# Filtrer les logs Google Sign-In
adb logcat | grep -i "googlesignin\|oauth"

# Rechercher les erreurs
adb logcat | grep -E "ERROR|Exception"
```

## ⚠️ Erreurs Courantes

### Erreur : "SHA-1 certificate mismatch"
**Cause** : Le SHA-1 de votre certificat ne correspond pas à celui enregistré dans Firebase.

**Solution** :
1. Générer le SHA-1 de votre certificat actuel (debug ou release)
2. L'ajouter dans Firebase Console
3. Télécharger le nouveau `google-services.json`
4. Remplacer les deux fichiers dans le projet
5. Rebuild l'app

### Erreur : "Package name mismatch"
**Cause** : Le package Android (`app.runconnect`) ne correspond pas à celui dans Firebase.

**Solution** :
- Vérifier que le package dans `AndroidManifest.xml` est bien `app.runconnect`
- Vérifier que le package dans Firebase Console est bien `app.runconnect`

### Erreur : "Client ID mismatch"
**Cause** : Le Web Client ID dans `strings.xml` ne correspond pas au client Firebase.

**Solution** :
- Vérifier que le client dans `strings.xml` est : `220304658307-u0l7i7hbsn4rd1ah8athg84tph0977km.apps.googleusercontent.com`
- Télécharger le `google-services.json` à jour depuis Firebase Console

### Popup Google ne s'affiche pas
**Cause** : Clients OAuth en conflit ou mal configurés.

**Solution** :
1. Nettoyer les clients OAuth en double dans Google Cloud Console
2. Vérifier que le Web Client ID est bien configuré
3. S'assurer que les domaines autorisés incluent votre URL de test/prod

## 📚 Ressources

- [Firebase Android Setup](https://firebase.google.com/docs/android/setup)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android/start-integrating)
- [OAuth 2.0 Client IDs](https://console.cloud.google.com/apis/credentials)
- [SHA Certificate Fingerprints](https://developers.google.com/android/guides/client-auth)

## ✅ Checklist Finale

- [ ] SHA-1 du certificat actuel généré
- [ ] SHA-1 ajouté dans Firebase Console
- [ ] Clients OAuth en double supprimés dans Google Cloud Console
- [ ] Client Android mis à jour avec le bon SHA-1
- [ ] `google-services.json` téléchargé et synchronisé dans les deux dossiers
- [ ] Web Client ID vérifié dans `strings.xml`
- [ ] App désinstallée et réinstallée
- [ ] Google Sign-In testé avec succès

## 🎯 Résultat Attendu

Après ces étapes, Google Sign-In devrait fonctionner avec :
- ✅ Popup Google native s'affichant correctement
- ✅ Sélection du compte Google fonctionnelle
- ✅ Connexion réussie sans erreur SHA-1
- ✅ Token JWT reçu et utilisateur authentifié
