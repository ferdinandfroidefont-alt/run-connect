

## Fix: Empêcher le zoom iOS sur les champs de saisie

### Problème
Sur iPhone, quand on clique sur une barre de recherche ou le champ d'envoi de message, Safari zoome automatiquement sur l'application, ce qui rend l'interface instable. Le correctif CSS précédent (`font-size: 16px !important`) ne suffit pas car le viewport HTML autorise toujours le zoom utilisateur.

### Solution
Deux modifications combinées pour bloquer définitivement le zoom :

**1. Modifier la balise viewport dans `index.html`**
Ajouter `maximum-scale=1.0, user-scalable=no` à la balise meta viewport pour interdire tout zoom sur iOS :
```
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**2. Nettoyer les doublons CSS dans `src/index.css`**
Le fichier contient actuellement deux blocs `@supports (-webkit-touch-callout: none)` avec la même règle `font-size: 16px !important`. Supprimer le doublon ajouté en ligne ~439 (garder uniquement celui dans le bloc principal iOS compact).

### Détails techniques
- `maximum-scale=1.0` empêche Safari de zoomer au-delà de l'échelle initiale
- `user-scalable=no` désactive le pinch-to-zoom et le zoom automatique au focus
- La règle CSS `font-size: 16px` reste en place comme sécurité supplémentaire
- Ces deux mesures combinées garantissent qu'aucun zoom ne se produit sur aucun champ de saisie

