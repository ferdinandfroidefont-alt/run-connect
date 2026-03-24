/** Extrait le chemin objet Supabase (ex. `userId/routeId/file.jpg`) depuis l’URL publique du bucket `route-photos`. */
export function routePhotoStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = '/route-photos/';
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  const rest = publicUrl.slice(i + marker.length).split('?')[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}
