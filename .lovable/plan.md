

## Problem

The `ConversationInfoSheet` component is placed in the **conversation list** branch of `Messages.tsx` (after line 2510), but it needs to be in the **active conversation** branch (lines 1700-2508). When a conversation is selected, the component hits an early `return` at line 2506, so the sheet at line 2946 is never in the DOM. Clicking the chevron sets `showConversationInfo = true` but there is no sheet to show.

## Solution

Move the `ConversationInfoSheet` render from the conversation list branch into the active conversation branch, just before the closing `</>` at line 2506.

## Implementation Steps

1. **Remove** the `ConversationInfoSheet` block from lines 2946-2969 (conversation list branch)
2. **Add** the same `ConversationInfoSheet` block inside the `selectedConversation` branch, right before the `</>` closing at line 2506

This is the same architectural issue documented in the project memory: global dialogs must be explicitly rendered in the active conversation branch because the early return prevents reaching code in the list branch.

## Technical Details

```text
Current structure:
  if (selectedConversation) {
    return (
      <>
        ... conversation UI ...
      </>              ← line 2506, early return
    );
  }

  return (
    <>
      ... conversation list ...
      <ConversationInfoSheet ... />   ← line 2946, NEVER rendered when chat is open
    </>
  );

Fixed structure:
  if (selectedConversation) {
    return (
      <>
        ... conversation UI ...
        <ConversationInfoSheet ... />  ← moved here
      </>
    );
  }

  return (
    <>
      ... conversation list ...
      // removed from here
    </>
  );
```

No new files or dependencies needed. Single file edit in `Messages.tsx`.

