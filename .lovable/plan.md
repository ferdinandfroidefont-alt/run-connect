

# Fix Voice Messages — Private Bucket + Signed URLs

## Root Cause
The `message-files` storage bucket is **private**, but the code calls `supabase.storage.from('message-files').getPublicUrl(filePath)` which only works for public buckets. The generated URLs return a 404, causing "Erreur audio".

## Solution
Use **signed URLs** (temporary, authenticated) instead of public URLs.

### Changes

**1. `src/pages/Messages.tsx` — Upload function**
In `uploadVoiceMessage` and `uploadFile`: replace `getPublicUrl()` with `createSignedUrl()` (e.g. 1 year expiry). Store the **file path** in `file_url` instead of the full public URL, so we can regenerate signed URLs later.

Actually, simpler approach: keep storing the full storage path, and generate signed URLs at display time. This way expired URLs can be refreshed.

- In `uploadVoiceMessage`: store the `filePath` (e.g. `userId/voice-xxx.webm`) as `file_url` instead of the public URL.
- Same for `uploadFile` for non-image files in the message-files bucket.

**2. `src/components/VoiceMessagePlayer.tsx` — Playback**
- Accept a `storagePath` prop (or detect if the `src` is a storage path vs full URL).
- On mount/play, call `supabase.storage.from('message-files').createSignedUrl(path, 3600)` to get a temporary URL.
- Use that signed URL for playback.

**3. Backward compatibility**
- Existing messages already have full public URLs stored in `file_url`. These won't work anymore regardless.
- Detect if `file_url` contains the storage base URL and extract the path, then generate a signed URL.
- Helper function: `getSignedAudioUrl(fileUrl: string)` that extracts the path from old URLs or uses the path directly, then calls `createSignedUrl`.

### Implementation Detail

```text
Helper: getMessageFileSignedUrl(fileUrlOrPath)
  → if starts with storage base URL, extract path after /message-files/
  → if already a relative path, use directly
  → call supabase.storage.from('message-files').createSignedUrl(path, 3600)
  → return signed URL
```

Update `VoiceMessagePlayer` to resolve the signed URL before playing, keeping the audio element creation in the user gesture context (iOS requirement).

### Files to edit
- `src/components/VoiceMessagePlayer.tsx` — add signed URL resolution
- `src/pages/Messages.tsx` — fix upload to store path, add helper

