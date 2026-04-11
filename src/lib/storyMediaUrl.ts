/**
 * Extrait le chemin storage (bucket story-media) depuis une URL publique ou signée Supabase.
 */
export function extractStoryMediaStoragePath(url: string): string | null {
  const marker = "/story-media/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const rest = url.slice(i + marker.length).split("?")[0];
  return rest ? decodeURIComponent(rest) : null;
}
