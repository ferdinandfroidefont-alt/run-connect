

## Refonte visuelle de l'écran "Détail séance" (SessionDetailsDialog)

L'objectif est de refondre **uniquement le rendu visuel** de `src/components/SessionDetailsDialog.tsx` pour qu'il corresponde exactement à l'image fournie (style Strava/Apple Fitness premium, mode clair, design RunConnect).

Toute la **logique métier existante reste intacte** : auth, requêtes Supabase, rejoindre/quitter, GPS, partage, modération, édition, duplication, notifications, ratings.

### Structure cible (de haut en bas)

1. **Header carte plein-width** (h ~280px)
   - Mini Mapbox (réutilise `createEmbeddedMapboxMap`) centré sur `location_lat/lng`
   - Pin custom centré : pastille orange/primary #5B7CFF avec icône activité (réutilise `ActivityIcon`)
   - Boutons flottants ronds blancs (44px, ombre douce) :
     - Top-left : retour (`ChevronLeft`)
     - Top-right : partager (`Share2`) + menu (`MoreHorizontal`)
   - Gradient bas (white→transparent) pour lisibilité

2. **Bloc titre** (px-5, pt-4)
   - Label orange `SÉANCE PISTE` (uppercase, tracking-wide, text-[13px], dérivé de `session_type`)
   - Titre bold text-[28px] leading-tight (titre généré : `{reps} × {dist}m allure {pace}/km` si structuré, sinon `session.title`)

3. **Ligne organisateur + participants** (px-5, py-3, flex justify-between)
   - Gauche : avatar 44px + nom + badge vérifié bleu + sous-texte "Voir le profil ›" (cliquable → ProfilePreviewDialog)
   - Droite : stack de 4 avatars chevauchés -space-x-2 + texte "{n} participants"

4. **Card Date + Lieu** (mx-4, rounded-2xl, border, 2 colonnes)
   - Gauche : icône calendrier + date (Samedi 25 mai 2024) + heure
   - Droite : icône pin + nom lieu + adresse (2 lignes max)
   - Sous le lieu : pill button "Ouvrir dans Google Maps" (logo Google Maps coloré)
   - Sous la date : pill button "Ajouter à Google Calendar" (réutilise `openGoogleCalendarLink`) — comme demandé par l'utilisateur

5. **Section "DÉTAILS DE LA SÉANCE"** (px-5)
   - Titre uppercase gris text-[13px]
   - Layout 2 colonnes : 
     - Gauche : timeline verticale avec pastilles colorées (vert échauffement / bleu blocs principaux / orange retour au calme), trait vertical 2px gris clair entre les pastilles, texte type + détail en dessous (parsing depuis `session_blocks`)
     - Droite : grille 2×2 de cards stats (rounded-xl, border, p-3) :
       - 👟 Distance totale
       - 🕐 Durée estimée
       - 📊 Allure moyenne
       - ⛰️ D+ estimé

6. **Section "PARCOURS"** (si `session.routes` existe)
   - Card horizontale rounded-2xl border :
     - Gauche (60%) : MiniMap avec polyline bleue du tracé (réutilise `setOrUpdateLineLayer`) + pin damier d'arrivée
     - Droite (40%) : distance grosse, "1 tour", min/max altitude, mini sparkline élévation
   - 2 boutons pleine largeur sous la card : "Voir en plein écran" / "Exporter GPX"

7. **Section "PHOTOS DU LIEU"** (si photos existent)
   - Scroll horizontal, miniatures 90×90 rounded-xl
   - Dernière vignette avec overlay sombre + "+{n}" centré

8. **CTA principal sticky bas** (px-4, pb-safe)
   - Grand bouton bleu #5B7CFF (h-14, rounded-2xl) "REJOINDRE LA SÉANCE" + sous-texte blanc/80 "Tu seras visible des autres participants"
   - À droite (40% width) : bouton secondaire bordé "Envoyer un message"
   - États dynamiques préservés : déjà inscrit / demande envoyée / organisateur (boutons gérer/supprimer) / passée (noter)

9. **Footer 4 actions rapides** (au-dessus du CTA, grille 4 colonnes)
   - Voir profil organisateur · Recevoir rappel · Partager · Ajouter au planning
   - Icônes fines, labels text-[11px] gris

### Contraintes techniques

- Mode **light only**, palette `#5B7CFF` (primary), oranges pour label type, verts/bleus/oranges pour timeline
- Police SF (déjà via `font-sans`), tailles iOS (text-ios-*)
- Espacements 8pt grid, `space-y-5` entre sections
- Safe areas : `pt-[env(safe-area-inset-top)]` header overlay, `pb-[env(safe-area-inset-bottom)]` CTA
- Aucun overflow horizontal : `min-w-0`, `truncate`
- Carte Mapbox : utilise `createEmbeddedMapboxMap` + `getMapboxAccessToken` (déjà en place)
- Génération du titre dynamique à partir de `session_blocks` (helper local `buildSessionTitle`)
- Préserver tous les states/handlers existants (rejoindre, quitter, supprimer, partager, GPS, rating, edit, duplicate)

### Fichier modifié
- `src/components/SessionDetailsDialog.tsx` — refonte JSX du `<DialogContent>`, conservation 100% de la logique React/Supabase

Aucun changement de schéma DB, aucune nouvelle dépendance.

