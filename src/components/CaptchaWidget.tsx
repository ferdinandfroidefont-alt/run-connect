import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useRef, forwardRef, useImperativeHandle } from "react";

/** Clé site hCaptcha (publique). À aligner avec Supabase → Auth → Attack Protection. */
const DEFAULT_HCAPTCHA_SITE_KEY = "78b48ff4-502a-4f56-9b7a-6718e8b895d2";

function getHcaptchaSiteKey(): string {
  const k = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : DEFAULT_HCAPTCHA_SITE_KEY;
}

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  showHelp?: boolean;
}

export interface CaptchaWidgetRef {
  resetCaptcha: () => void;
}

export const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(
  ({ onVerify, onExpire, onError, showHelp = true }, ref) => {
    const captchaRef = useRef<HCaptcha>(null);
    const sitekey = getHcaptchaSiteKey();

    useImperativeHandle(ref, () => ({
      resetCaptcha: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    const handleRefresh = () => {
      captchaRef.current?.resetCaptcha();
    };

    return (
      <div className="space-y-2">
        <div className="my-4 flex justify-center">
          <HCaptcha
            ref={captchaRef}
            sitekey={sitekey}
            onVerify={onVerify}
            onExpire={() => {
              onExpire?.();
            }}
            onError={(err) => {
              onError?.(err);
            }}
            theme="light"
          />
        </div>

        {showHelp && (
          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground">
              Cochez la case pour prouver que vous n&apos;êtes pas un robot
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs text-primary hover:underline"
            >
              Le CAPTCHA ne s&apos;affiche pas ? Cliquez pour rafraîchir
            </button>
          </div>
        )}
      </div>
    );
  }
);

CaptchaWidget.displayName = "CaptchaWidget";
