import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_MARKER = '/message-files/';

/**
 * Extracts the storage path from a full public URL or returns the path as-is.
 */
export const extractStoragePath = (fileUrlOrPath: string): string => {
  if (!fileUrlOrPath.startsWith('http')) return fileUrlOrPath;
  const idx = fileUrlOrPath.indexOf(STORAGE_MARKER);
  if (idx !== -1) return fileUrlOrPath.substring(idx + STORAGE_MARKER.length);
  return fileUrlOrPath;
};

/**
 * Generates a signed URL for a file in the message-files bucket.
 */
export const getSignedFileUrl = async (fileUrlOrPath: string): Promise<string | null> => {
  const path = extractStoragePath(fileUrlOrPath);
  const { data, error } = await supabase.storage
    .from('message-files')
    .createSignedUrl(path, 3600);
  if (error) {
    console.error('❌ Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
};

/**
 * Hook that resolves a signed URL for a message-files storage path.
 */
export const useSignedUrl = (fileUrlOrPath: string | null | undefined) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrlOrPath) return;

    let cancelled = false;
    getSignedFileUrl(fileUrlOrPath).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });

    return () => { cancelled = true; };
  }, [fileUrlOrPath]);

  return signedUrl;
};
