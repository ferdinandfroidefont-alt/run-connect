

## Diagnostic approfondi

Le probleme persiste malgre plusieurs tentatives. L'approche actuelle combine `modal={false}`, `e.preventDefault()`, et `setAttachMenuOpen(false)` - ces trois instructions entrent en conflit :

1. `e.preventDefault()` empeche Radix de fermer le menu par defaut
2. `setAttachMenuOpen(false)` force la fermeture via le state
3. `modal={false}` change le comportement du focus mais peut empecher le `DialogOverlay` de se superposer correctement

Le `setTimeout` de 150ms ne suffit peut-etre pas pour que le DOM soit nettoye apres la fermeture du dropdown avec `modal={false}`.

## Solution : approche simplifiee

### Fichier : `src/pages/Messages.tsx`

**Supprimer toute la complexite** et utiliser l'approche la plus directe possible :

1. **Retirer `modal={false}`** du `DropdownMenu` - revenir au comportement modal par defaut de Radix
2. **Retirer `open` et `onOpenChange`** du `DropdownMenu` - laisser Radix gerer son propre state
3. **Supprimer le state `attachMenuOpen`** - il n'est plus necessaire
4. **Sur le `DropdownMenuItem` "Sondage"** : utiliser un simple `onClick` avec un `setTimeout` de 300ms (plus long pour laisser le dropdown modal se fermer completement avec son animation)

```tsx
<DropdownMenu>
  ...
  <DropdownMenuItem
    onClick={() => {
      setTimeout(() => setShowCreatePoll(true), 300);
    }}
    className="py-3"
  >
    <BarChart3 className="h-4 w-4 mr-3 text-[#5856D6]" />
    Sondage
  </DropdownMenuItem>
  ...
</DropdownMenu>
```

Le `DropdownMenuItem` avec `onClick` fermera automatiquement le dropdown (comportement par defaut de Radix). Le `setTimeout` de 300ms garantit que le dialog ne s'ouvre qu'apres la fermeture complete du dropdown et de son overlay, evitant tout conflit de focus ou de z-index.

5. **Ajouter `aria-describedby={undefined}`** au `DialogContent` dans `CreatePollDialog.tsx` pour eviter un warning Radix qui pourrait bloquer le rendu dans certains cas.

### Changements concrets

**`src/pages/Messages.tsx`** :
- Ligne 179 : supprimer `const [attachMenuOpen, setAttachMenuOpen] = useState(false);`
- Ligne 2188 : remplacer `<DropdownMenu open={attachMenuOpen} onOpenChange={setAttachMenuOpen} modal={false}>` par `<DropdownMenu>`
- Lignes 2230-2240 : remplacer le `onSelect` par un `onClick` avec `setTimeout` de 300ms

**`src/components/CreatePollDialog.tsx`** :
- Ligne 96 : ajouter `aria-describedby={undefined}` au `DialogContent` pour eviter les warnings Radix sur le titre/description manquants

