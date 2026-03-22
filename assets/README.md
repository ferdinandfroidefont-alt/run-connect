# Icône d’application (iOS & Android)

Capacitor utilise ce dossier comme **source unique** : tu remplaces **un seul fichier**, puis une commande génère toutes les tailles dans le projet natif.

## Étapes

1. **Exporte ton logo** en PNG carré **1024 × 1024 px** (fond opaque recommandé pour l’icône App Store).
2. **Enregistre-le ici** avec le nom exact :
   - **`icon-only.png`** ← obligatoire pour l’icône principale  
3. Installe les outils (une fois), si ce n’est pas déjà fait :
   ```bash
   npm install --legacy-peer-deps
   ```
4. Assure-toi d’avoir la plateforme iOS dans le projet (une fois) :
   ```bash
   npx cap add ios
   ```
5. **Génère les icônes** vers `ios/` (et mets à jour l’asset catalog Xcode) :
   ```bash
   npm run assets:ios
   ```
   Pour iOS **et** Android :
   ```bash
   npm run assets:generate
   ```
6. (Optionnel) Synchronise le web build avec les natifs :
   ```bash
   npm run build
   npx cap sync ios
   ```

## Fichiers optionnels (Android adaptatif, splash)

Si tu en as besoin plus tard, tu peux aussi ajouter (voir [doc Capacitor](https://capacitorjs.com/docs/guides/splash-screens-and-icons)) :

- `icon-foreground.png` / `icon-background.png` — icône adaptive Android  
- `splash.png` / `splash-dark.png` — écrans de lancement (grande taille, voir doc)

## Résumé

| Fichier à créer / remplacer | Rôle        |
|----------------------------|-------------|
| **`assets/icon-only.png`** | Icône app (iOS + base Android) |

Sans `icon-only.png`, la commande `npm run assets:ios` ne pourra pas générer les images.
