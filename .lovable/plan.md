

## Diagnostic

Les logs confirment que `🗳️ Sondage clicked` est bien execute (2 fois meme). Le state `showCreatePoll` passe a `true` et le `CreatePollDialog` se monte. **Mais le dialog ne s'affiche pas visuellement.**

**Cause racine** : le `<div>` qui a remplace le `DropdownMenuItem` ne ferme pas le dropdown. Contrairement a un `DropdownMenuItem`, un simple `<div>` ne declenche pas la fermeture automatique du `DropdownMenuContent`. Le dropdown reste ouvert par-dessus le dialog, le masquant completement.

## Solution

### Fichier : `src/pages/Messages.tsx`

1. **Controler l'ouverture du dropdown avec un state** : ajouter `const [attachMenuOpen, setAttachMenuOpen] = useState(false)` et passer `open={attachMenuOpen}` / `onOpenChange={setAttachMenuOpen}` au `<DropdownMenu>`.

2. **Remettre un `DropdownMenuItem`** pour le sondage (supprimer le `<div>`) mais avec `onSelect` qui :
   - Ferme le dropdown via `setAttachMenuOpen(false)`
   - Ouvre le dialog avec un `setTimeout` de 150ms : `setTimeout(() => setShowCreatePoll(true), 150)`

Cela garantit que le dropdown se ferme proprement avant que le dialog s'ouvre.

### Changements concrets

**Ajout du state** (vers ligne 178) :
```tsx
const [attachMenuOpen, setAttachMenuOpen] = useState(false);
```

**Modification du DropdownMenu** (ligne 2187) :
```tsx
<DropdownMenu open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
```

**Remplacement du div par DropdownMenuItem** (lignes 2229-2239) :
```tsx
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();
    setAttachMenuOpen(false);
    setTimeout(() => setShowCreatePoll(true), 150);
  }}
  className="py-3"
>
  <BarChart3 className="h-4 w-4 mr-3 text-[#5856D6]" />
  Sondage
</DropdownMenuItem>
```

