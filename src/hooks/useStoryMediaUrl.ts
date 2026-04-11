import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractStoryMediaStoragePath } from "@/lib/storyMediaUrl";

/**
 * Résout une URL affichable pour le bucket story-media (signée si possible, sinon URL d’origine).
 */
export function useStoryMediaUrl(rawUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rawUrl) {
      setUrl(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const path = extractStoryMediaStoragePath(rawUrl);
      if (path) {
        const { data, error } = await supabase.storage.from("story-media").createSignedUrl(path, 3600);
        if (!cancelled && !error && data?.signedUrl) {
          setUrl(data.signedUrl);
          return;
        }
      }
      if (!cancelled) setUrl(rawUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [rawUrl]);

  return url;
}
