

## Corriger le debordement horizontal de l'ecran "Partager mon profil" sur iPhone

### Probleme
Sur iPhone, le contenu du dialog "Partager mon profil" (QR code + boutons) est partiellement coupe a droite. Cela vient de la combinaison `w-full h-full max-w-full max-h-full` sur le `DialogContent` qui, associee au positionnement `left-[50%] translate-x-[-50%]` du composant dialog de base, peut creer un debordement. De plus, les elements internes (glow blur, QR container) n'ont pas de contrainte `overflow-hidden` et peuvent deborder.

### Modifications

**Fichier 1 : `src/components/QRShareDialog.tsx`**

- Ligne 231 : Remplacer les classes du `DialogContent` pour forcer `overflow-x-hidden`, utiliser `w-[100%]` au lieu de `w-full h-full max-w-full max-h-full`, et ajouter du padding safe-area :
  ```
  className="w-[100%] max-w-[100vw] h-full max-h-full sm:max-w-sm sm:max-h-[90vh] rounded-none sm:rounded-lg p-0 overflow-hidden overflow-x-hidden border-0 sm:border bg-gradient-to-br from-background via-background to-primary/5 flex flex-col"
  ```
- Ligne 247 : Ajouter `overflow-hidden` au conteneur interne `px-6 pb-6` pour que les effets blur ne debordent pas :
  ```
  className="px-4 sm:px-6 pb-6 space-y-5 overflow-hidden"
  ```
- Ligne 281-282 : Simplifier le conteneur QR pour eviter le `absolute inset-0` du glow qui peut causer un debordement, et centrer avec flex :
  ```
  <div className="flex justify-center overflow-hidden">
    <div className="relative max-w-[280px]">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-cyan-400/30 rounded-2xl blur-xl opacity-50" />
      ...
  ```
- Ligne 310 : Ajouter `overflow-hidden` au bloc code parrainage.
- Lignes 325-363 : Ajouter des marges laterales aux boutons d'action pour eviter qu'ils touchent les bords.

**Fichier 2 : `src/components/SettingsDialog.tsx`**

- Ligne 400 : Le `DialogContent` a deja `overflow-x-hidden`, mais verifier que `max-w-[100vw]` est present.
- Ligne 475 : Ajouter `overflow-hidden` au conteneur de la section "Partager mon profil" :
  ```
  className="bg-background overflow-hidden px-4 sm:px-6 py-4 space-y-4"
  ```
- Ligne 503-504 : Meme correction que QRShareDialog pour le conteneur QR avec `overflow-hidden` et flex center.

**Fichier 3 : `src/index.css`**

- Ajouter une regle globale `overflow-x: hidden` sur `html` et `body` pour prevenir tout scroll horizontal residuel sur iPhone :
  ```css
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
  ```

### Resume des corrections

| Fichier | Correction |
|---------|-----------|
| `QRShareDialog.tsx` | `overflow-hidden` sur le dialog et conteneurs internes, padding `px-4`, conteneur QR avec `max-w` et `overflow-hidden` |
| `SettingsDialog.tsx` | `overflow-hidden` sur la section partage, padding `px-4`, conteneur QR corrige |
| `index.css` | `overflow-x: hidden` et `max-width: 100vw` global sur html/body |

