
# Remplacement de l'icone RunConnect

## Ce qui va etre fait

1. **Copier la nouvelle icone** dans `src/assets/app-icon-new.png` (remplace l'ancienne)
2. **Ecran de chargement** (`src/components/LoadingScreen.tsx`, ligne 80) : l'image importee depuis `src/assets/app-icon.png` sera remplacee par la nouvelle icone
3. **Page A propos** (`src/pages/About.tsx`, lignes 33-35) : remplacer l'emoji runner dans le carre gradient par la nouvelle icone importee, affichee en `w-24 h-24 rounded-3xl`

## Details techniques

**Fichiers modifies :**
- `src/assets/app-icon.png` : remplace par la nouvelle image uploadee
- `src/components/LoadingScreen.tsx` : aucun changement de code necessaire (importe deja `app-icon.png`)
- `src/pages/About.tsx` : ajouter `import appIcon from '@/assets/app-icon.png'` et remplacer le bloc emoji par une balise `<img>`
