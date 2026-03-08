

## Plan: Plein écran iOS pour RouteEditDialog et RouteDialog

Les deux dialogs d'itinéraire (édition et sauvegarde après création) ne s'affichent pas en plein écran sur mobile. Il faut appliquer le même pattern fullscreen iOS que les autres dialogs de l'app.

### Fichiers à modifier

**1. `src/components/RouteEditDialog.tsx`**
- Utiliser `fullScreen` prop du DialogContent sur mobile au lieu de classes manuelles
- Ajouter un header avec bouton retour style iOS (ArrowLeft + "Retour")
- Padding et espacement cohérents avec le reste de l'app

**2. `src/components/RouteDialog.tsx`**
- Importer `useIsMobile`
- Appliquer le même pattern fullscreen sur mobile : `fullScreen={isMobile}`
- Ajouter un header iOS avec bouton retour
- Adapter le padding et layout pour mobile

### Pattern appliqué (identique à RouteDetailDialog)
- `<DialogContent fullScreen={isMobile} className="[&>button]:hidden">` sur mobile
- Header sticky avec `ArrowLeft` + "Retour" qui ferme le dialog
- Contenu scrollable avec padding adapté
- Sur desktop : garder `max-w-md` classique

