
L'utilisateur indique que la photo de profil superposée sur la carte n'est pas bien alignée avec le cercle de la maquette. Je dois ajuster les coordonnées CSS dans `ProfileSharePanel.tsx`.

Sans pouvoir mesurer exactement la nouvelle image, je vais demander à l'utilisateur de préciser dans quel sens ajuster (trop haut/bas, trop grand/petit), ou tenter un ajustement basé sur des valeurs typiques.

## Plan

**Fichier:** `src/components/profile-share/ProfileSharePanel.tsx`

Ajuster les coordonnées de superposition de l'avatar pour qu'il corresponde précisément au cercle de la nouvelle maquette :

- Repositionner verticalement (probablement plus bas, vers `top: 18%` au lieu de `14.7%`)
- Ajuster la taille du cercle (probablement `width: 17%` au lieu de `19%`)
- Garder le centrage horizontal à `left: 50%`

Je vais procéder par itérations visuelles : appliquer un ajustement, puis te demander si c'est mieux ou s'il faut bouger encore (haut/bas/gauche/droite, plus grand/petit).

Si tu peux me préciser dans quel sens c'est décalé (par ex. "trop haut", "trop gros", "trop à gauche"), je calerai en un seul coup.
