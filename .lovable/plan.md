

## Corriger les debordements horizontaux sur iPhone

### Le probleme

Sur iPhone, certains elements debordent du cote droit de l'ecran dans deux endroits :

1. **Parametres > Partager mon profil** : Le code parrainage, l'URL, le bouton "Copier le lien", et les boutons "Partager"/"Story" sont coupes a droite
2. **Creer une seance > Etape Lieu** : Le bouton "Centre carte" est coupe a droite

### Cause

Les conteneurs internes des dialogs ne contraignent pas correctement la largeur de leurs enfants. Meme si le `DialogContent` a `overflow-hidden`, les sous-conteneurs (ScrollArea, zone de contenu des etapes) peuvent depasser la largeur disponible sur les petits ecrans iPhone.

### Corrections

#### 1. Fichier : `src/components/SettingsDialog.tsx`

- Ajouter `overflow-x-hidden` sur le conteneur de la section "Partager mon profil" (ligne 475)
- Contraindre la largeur du texte URL avec `max-w-full` et `overflow-hidden` pour eviter le debordement
- S'assurer que les boutons d'action restent dans les limites avec `overflow-hidden` sur leur conteneur

#### 2. Fichier : `src/components/session-creation/CreateSessionWizard.tsx`

- Ajouter `overflow-x-hidden` sur le conteneur de contenu des etapes (ligne 421) pour empecher le debordement horizontal

#### 3. Fichier : `src/components/session-creation/steps/LocationStep.tsx`

- Ajouter `overflow-hidden` sur le conteneur des boutons d'action (ligne 199) pour empecher le texte des boutons de depasser
- Ajouter `truncate` sur le texte des boutons pour couper proprement le texte trop long

### Resultat attendu

- Tous les elements restent visibles et contenus dans la largeur de l'ecran iPhone
- Les textes longs sont tronques proprement au lieu de depasser
- Aucun changement visuel sur les ecrans plus grands

