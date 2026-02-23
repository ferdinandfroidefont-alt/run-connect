

## Supprimer les themes de conversation

Les themes de conversation (ocean, sunset, forest, night, runner) sont encore presents dans 4 fichiers. Voici les modifications necessaires pour tout supprimer proprement.

### Fichiers a supprimer

- `src/hooks/useConversationTheme.tsx` - Le hook entier
- `src/components/ConversationThemeSelector.tsx` - Le composant selecteur entier

### Fichiers a modifier

#### 1. `src/pages/Messages.tsx`

- Retirer l'import de `useConversationTheme`
- Retirer l'appel `const { getThemeClasses } = useConversationTheme()`
- Remplacer `getThemeClasses().background` par les classes par defaut : `bg-secondary`
- Remplacer `getThemeClasses().ownMessage` par `bg-primary text-primary-foreground`
- Remplacer `getThemeClasses().otherMessage` par `bg-[#E5E5EA] text-black dark:bg-[#38383A] dark:text-white`

#### 2. `src/components/settings/SettingsConnections.tsx`

- Retirer les imports de `ConversationThemeSelector` et `useConversationTheme`
- Retirer les states `conversationTheme`, `setConversationTheme`, `showConversationThemes`
- Retirer le bouton "Themes de conversation" dans la section Personnalisation
- Retirer le `Dialog` qui affiche le `ConversationThemeSelector`

### Nettoyage localStorage

Les themes sauvegardes dans `localStorage` sous la cle `conversation-theme-{userId}` ne seront plus lus et deviendront obsoletes (pas de nettoyage actif necessaire).

