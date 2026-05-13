import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstileConfig";

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

function waitForTurnstile(maxMs = 15000): Promise<NonNullable<Window["turnstile"]>> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }
      if (Date.now() - start > maxMs) {
        reject(new Error("Turnstile indisponible"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onToken, onExpire, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onTokenRef = useRef(onToken);
    const onExpireRef = useRef(onExpire);
    const onErrorRef = useRef(onError);

    useEffect(() => {
      onTokenRef.current = onToken;
    }, [onToken]);
    useEffect(() => {
      onExpireRef.current = onExpire;
    }, [onExpire]);
    useEffect(() => {
      onErrorRef.current = onError;
    }, [onError]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
      },
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      let cancelled = false;

      (async () => {
        try {
          const turnstile = await waitForTurnstile();
          if (cancelled || !containerRef.current) return;
          const id = turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            appearance: "interaction-only",
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onExpireRef.current?.(),
            "error-callback": () => onErrorRef.current?.(),
          });
          widgetIdRef.current = id;
        } catch {
          onErrorRef.current?.();
        }
      })();

      return () => {
        cancelled = true;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
        widgetIdRef.current = null;
      };
    }, []);

    return (
      <div
        className="flex min-h-[70px] w-full flex-col items-center justify-center"
        ref={containerRef}
      />
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
