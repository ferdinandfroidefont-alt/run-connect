

# Afficher la barre de navigation sur la page "Confirmer une seance"

## Modification

**Fichier** : `src/App.tsx` (lignes 75-76)

Envelopper les deux routes `/confirm-presence` et `/confirm-presence/:sessionId` dans `<Layout>` :

```
// Avant
<Route path="/confirm-presence" element={<PageTransition><ConfirmPresence /></PageTransition>} />
<Route path="/confirm-presence/:sessionId" element={<PageTransition><ConfirmPresence /></PageTransition>} />

// Apres
<Route path="/confirm-presence" element={<Layout><PageTransition><ConfirmPresence /></PageTransition></Layout>} />
<Route path="/confirm-presence/:sessionId" element={<Layout><PageTransition><ConfirmPresence /></PageTransition></Layout>} />
```

C'est la seule modification necessaire. Le composant `Layout` inclut deja la `BottomNavigation`.

