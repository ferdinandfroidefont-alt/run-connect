import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_WEB_ORIGIN, buildSessionDeepLink, getStoreFallbackUrl } from "@/lib/appLinks";

export default function OpenSessionLink() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const fallbackStoreUrl = useMemo(() => getStoreFallbackUrl(), []);
  const [opening, setOpening] = useState(false);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const isNative = !!(window as any).CapacitorForceNative || !!(window as any).Capacitor;
    if (isNative) {
      navigate(`/?session=${encodeURIComponent(sessionId)}`, { replace: true });
      return;
    }

    setOpening(true);
    const deepLink = buildSessionDeepLink(sessionId);
    window.location.href = deepLink;
    fallbackTimerRef.current = window.setTimeout(() => {
      window.location.href = fallbackStoreUrl;
    }, 1400);

    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [fallbackStoreUrl, navigate, sessionId]);

  const openRunConnect = () => {
    const deepLink = buildSessionDeepLink(sessionId);
    window.location.href = deepLink;
    window.setTimeout(() => {
      window.location.href = fallbackStoreUrl;
    }, 1400);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h1 className="text-lg font-semibold text-foreground">Ouvrir avec RunConnect</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette séance a été partagée depuis une story. Ouvre-la dans RunConnect, sinon installe l&apos;app.
        </p>
        <div className="mt-4 space-y-2">
          <Button type="button" className="w-full" onClick={openRunConnect}>
            Ouvrir avec RunConnect
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = fallbackStoreUrl;
            }}
          >
            Installer RunConnect
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              window.location.href = `${APP_WEB_ORIGIN}/?session=${encodeURIComponent(sessionId)}`;
            }}
          >
            Continuer sur le web
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {opening ? "Ouverture en cours..." : "Lien prêt"}
        </p>
      </div>
    </div>
  );
}
