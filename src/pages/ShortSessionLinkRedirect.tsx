import { Navigate, useParams } from 'react-router-dom';

/** Redirige le lien court `/s/:id` vers la landing d’ouverture existante (Universal Links / App Links). */
export default function ShortSessionLinkRedirect() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  return <Navigate to={`/open/session/${encodeURIComponent(sessionId)}`} replace />;
}
