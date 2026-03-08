

# Fix: Follow notification system - anti-duplicates and state consistency

## Root causes identified

1. **Double notification**: The DB trigger `trigger_follow_request_notification` creates a notification on `user_follows` INSERT (status='pending'). Then the frontend calls `sendPushNotification` which invokes the edge function `send-push-notification`, which ALSO inserts into the `notifications` table (line 286). Result: 2 identical notifications per follow request.

2. **Stale action buttons**: `NotificationCenter` shows Accept/Refuse buttons based on `!notification.read` instead of checking the actual `user_follows` status. Accepted/rejected requests still show action buttons.

3. **No dedup in trigger or edge function**: Neither checks for existing notifications before inserting.

4. **Multiple frontend follow-request senders**: Both `useFollow.sendFollowRequest` and `ProfilePreviewDialog.handleFollowToggle` directly insert into `user_follows` AND send push notifications independently.

## Plan

### 1. Stop edge function from creating duplicate DB notifications for follow_request

In `supabase/functions/send-push-notification/index.ts`, skip the `notifications` table INSERT when `type` is `follow_request` (since the DB trigger already handles it). The edge function should only send the FCM push, not create a duplicate DB record.

Add a check before line 286: if `type === 'follow_request'`, skip the DB insert and just send FCM. Same for `follow_accepted` since `useFollow.acceptFollowRequest` and `NotificationCenter.handleAcceptFollow` already handle the DB side.

### 2. Add dedup guard in DB trigger

Modify `trigger_follow_request_notification` to check if a notification already exists for the same follower→following pair with type='follow_request' and created within the last hour before inserting a new one.

SQL migration:
```sql
CREATE OR REPLACE FUNCTION public.trigger_follow_request_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  follower_profile RECORD;
  existing_notif_id uuid;
BEGIN
  -- Check for existing unresolved notification (dedup)
  SELECT id INTO existing_notif_id
  FROM notifications
  WHERE user_id = NEW.following_id
    AND type = 'follow_request'
    AND (data->>'follower_id')::text = NEW.follower_id::text
    AND created_at > now() - interval '24 hours';
  
  IF existing_notif_id IS NOT NULL THEN
    RETURN NEW; -- Skip duplicate
  END IF;

  SELECT username, display_name, avatar_url 
  INTO follower_profile FROM profiles WHERE user_id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.following_id, 'follow_request',
    'Nouvelle demande de suivi',
    COALESCE(follower_profile.display_name, follower_profile.username, 'Quelqu''un') || ' souhaite vous suivre',
    json_build_object(
      'follow_id', NEW.id,
      'follower_id', NEW.follower_id,
      'follower_name', COALESCE(follower_profile.display_name, follower_profile.username),
      'follower_avatar', follower_profile.avatar_url
    )
  );
  RETURN NEW;
END;
$$;
```

### 3. Validate follow state before showing action buttons in NotificationCenter

In `NotificationCenter.tsx`, when rendering follow_request notifications:
- On sheet open, batch-check the actual `user_follows` status for all follow_request notification follower_ids
- Store resolved statuses in a `Map<followerId, 'pending' | 'accepted' | 'none'>`
- Only show Accept/Refuse buttons if the actual follow status is still `pending`
- Show "Demande acceptee" passive text if status is `accepted`
- Hide buttons entirely if the follow row is gone (rejected/cancelled)

### 4. Mark old notifications as read after accept/reject

In `handleAcceptFollow` and `handleRejectFollow`, after the action succeeds:
- Update local state immediately (optimistic)
- Also mark ALL notifications with `type='follow_request'` and same `follower_id` as read (handles duplicates)

### 5. Deduplicate at render time

In the notification list rendering, deduplicate `follow_request` notifications by `follower_id`: keep only the most recent one per follower, skip older duplicates.

### 6. Remove redundant push notification call from ProfilePreviewDialog

`ProfilePreviewDialog.handleFollowToggle` inserts into `user_follows` (triggering the DB notification trigger) AND calls `sendPushNotification`. Remove the `sendPushNotification` call since the trigger handles the DB notification, and the edge function will still send FCM when called from `useFollow`.

Actually, cleaner approach: keep `sendPushNotification` for the FCM push only (no DB insert), and let the trigger handle DB notification creation exclusively.

### Files to modify

1. **`supabase/functions/send-push-notification/index.ts`** — skip DB insert for `follow_request` and `follow_accepted` types (trigger/frontend handle it)
2. **DB migration** — update `trigger_follow_request_notification` with dedup check
3. **`src/components/NotificationCenter.tsx`** — validate follow state on render, dedup by follower_id, mark all related notifs on accept/reject, immediate UI update
4. **`src/components/ProfilePreviewDialog.tsx`** — remove redundant `sendPushNotification` call (trigger handles DB notif)
5. **`src/hooks/useFollow.tsx`** — in `sendFollowRequest`, keep push call but it won't create DB duplicate anymore

### What stays unchanged
- All non-follow notification types (session_request, club_invitation, etc.)
- Follow relationship logic (user_follows table, accept_follow_request RPC)
- Push notification delivery (FCM)
- Realtime subscription
- All other handlers

