import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRef, forwardRef, useImperativeHandle } from 'react';

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
        <div className="flex justify-center my-4">
          <HCaptcha
            ref={captchaRef}
            sitekey="78b48ff4-502a-4f56-9b7a-6718e8b895d2"
            onVerify={onVerify}
            onExpire={() => {
              onExpire?.();
            }}
            onError={(err) => {
              onError?.(err);
            }}
            theme="dark"
          />
        </div>
        
        {showHelp && (
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              🔒 Cochez la case pour prouver que vous n'êtes pas un robot
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs text-primary hover:underline"
            >
              Le CAPTCHA ne s'affiche pas ? Cliquez pour rafraîchir
            </button>
          </div>
        )}
      </div>
    );
  }
);

CaptchaWidget.displayName = 'CaptchaWidget';
