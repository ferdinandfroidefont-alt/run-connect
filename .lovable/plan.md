

# Refonte Complète : Page Conversation Style iMessage

## Analyse de l'image de référence

L'image montre un design iMessage iOS avec :
- **Header** : Bouton retour (chevron simple), avatar circulaire centré avec nom en dessous, icône appel vidéo à droite
- **Messages** : Bulles bleues (expéditeur) / grises (reçues) avec coins arrondis style iOS
- **Images** : Affichées dans des coins arrondis larges, intégrées dans le flux
- **Emojis** : Affichage grand format sans bulle quand seul emoji
- **Input** : Zone de saisie minimaliste avec "+" à gauche, "iMessage" au centre, micro à droite
- **Fond** : Blanc/gris clair très épuré

## Modifications prévues

### 1. Header de conversation (style iMessage natif)

**Avant** : Header avec "Retour" texte, avatar à côté du nom, menu options

**Après** :
- Chevron retour simple (sans texte) à gauche
- Avatar centré (plus grand, 40px) avec nom en dessous
- Le nom devient cliquable pour accéder au profil
- Suppression du menu "..." pour désencombrer (accessible via tap sur l'avatar/nom)

```
[<]          [Avatar]          [ⓘ]
              Orkun
```

### 2. Zone de messages (style iMessage pur)

**Bulles de messages redessinées** :
- Messages envoyés : Bleu iOS (#007AFF), coins arrondis 18px, queue de bulle iOS
- Messages reçus : Gris clair (#E5E5EA), coins arrondis 18px
- Suppression des ombres et effets "glass"
- Padding interne optimisé (12px horizontal, 8px vertical)
- Largeur max : 75% de l'écran

**Timestamps** :
- Masqués par défaut
- Apparaissent au tap sur le message
- Style pilule centré pour les séparateurs de date

**Avatars** :
- Masqués pour les messages de l'utilisateur
- Affichés uniquement pour les messages reçus dans les groupes
- Cachés dans les conversations 1-to-1 (style iMessage)

### 3. Zone de saisie (style iMessage)

**Nouveau design** :
```
[+]  |  iMessage...  |  [🎤]
```

- Bouton "+" à gauche (ouvre les options : galerie, fichier, emoji)
- Champ de saisie central avec placeholder "iMessage"
- Bouton micro à droite (devient flèche d'envoi quand texte présent)
- Fond gris très clair (#F2F2F7) avec bordure subtile
- Coins arrondis 20px

### 4. Fond et couleurs

- Fond de conversation : Blanc pur (#FFFFFF)
- Messages envoyés : Bleu iOS (#007AFF)
- Messages reçus : Gris iOS (#E5E5EA)
- Texte envoyé : Blanc
- Texte reçu : Noir

## Résumé technique

| Fichier | Modification |
|---------|--------------|
| `src/pages/Messages.tsx` | Refonte complète de la section conversation (header, messages, input) |
| `src/hooks/useConversationTheme.tsx` | Mise à jour du thème par défaut pour correspondre à iMessage |
| `src/components/MessageTimestamp.tsx` | Style des timestamps en pilule iOS |
| `src/components/TypingIndicator.tsx` | Style discret type iMessage |

## Fonctionnalités préservées

Toutes les fonctionnalités actuelles sont conservées :
- Bouton retour (simplifié en chevron)
- Envoi de messages texte
- Partage d'images et fichiers
- Messages vocaux
- Sélecteur d'emojis
- Indicateur de frappe
- Status de lecture (vu/lu)
- Partage de sessions
- Suppression de messages
- Accès au profil (via tap sur avatar/nom)
- Gestion des groupes/clubs

## Aperçu visuel du résultat

Le design final ressemblera exactement à l'application iMessage iOS avec :
- Look épuré et minimaliste
- Bulles de messages reconnaissables
- Zone de saisie discrète
- Navigation intuitive

