

## Corriger le chargement de la carte et le bouton Retour du mode Suivi

### Probleme principal : conflit Google Maps Loader

La carte ne se charge jamais car Google Maps est deja charge par la carte interactive (page principale) avec les librairies `geometry` et `places`. Quand le mode Suivi essaie de creer un nouveau `Loader` avec la librairie `marker`, Google Maps refuse avec l'erreur : **"Loader must not be called again with different options"**.

Le bouton Retour ne fonctionne pas une fois la carte affichee car l'ecran de chargement (spinner) n'a aucun bouton Retour, et apres le chargement, les elements Google Maps bloquent les clics.

### Corrections

**Fichier 1 : `src/pages/TrainingMode.tsx`**

1. **Supprimer la creation d'un nouveau `Loader`** : Au lieu de creer un nouveau `Loader` avec des options differentes, reutiliser l'API Google Maps deja chargee en memoire via `window.google.maps`. Si elle n'est pas encore chargee, utiliser le `Loader` avec toutes les librairies necessaires (`geometry`, `places`, `marker`).

2. **Ajouter un bouton Retour sur l'ecran de chargement** : L'ecran "Chargement de l'itineraire..." n'a actuellement aucun moyen de revenir en arriere.

3. **Lancer le fetch de la cle API en parallele** : Actuellement, la cle API est fetchee apres le chargement des donnees de route. Lancer les deux en parallele pour gagner du temps.

4. **Renforcer le z-index du bouton Retour** : Ajouter `position: relative` et un z-index eleve directement sur le bouton pour garantir qu'il reste cliquable au-dessus de Google Maps.

### Detail technique

```text
Avant (sequentiel, plante) :
  1. Charger donnees route (Supabase)  ~500ms
  2. Spinner sans bouton retour
  3. Fetch cle API (edge function)     ~500ms
  4. new Loader({marker})              --> CRASH (conflit)
  5. Carte jamais affichee

Apres (parallele, sans conflit) :
  1. Charger donnees route + cle API   en parallele ~500ms
  2. Spinner AVEC bouton retour
  3. Utiliser window.google.maps si deja charge
  4. Sinon Loader({geometry, places, marker})
  5. Carte affichee rapidement
```

### Modifications detaillees

**`src/pages/TrainingMode.tsx`**

- Remplacer l'initialisation du `Loader` (lignes 62-70) par une verification de `window.google?.maps` d'abord, et en fallback utiliser un `Loader` avec toutes les librairies (`geometry`, `places`, `marker`) pour eviter le conflit.
- Ajouter un bouton "Retour" (fleche + texte) dans l'ecran de chargement (lignes 260-268).
- Ajouter un bouton "Retour" dans l'ecran d'erreur qui utilise la meme logique de navigation.
- Ajouter `style={{ position: 'relative', zIndex: 10000 }}` sur le bouton Retour de la barre superieure pour garantir la cliquabilite.

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/TrainingMode.tsx` | Reutiliser Google Maps deja charge, bouton retour sur loading/erreur, z-index renforce |

