import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useRef, forwardRef, useImperativeHandle } from 'react';

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

export interface CaptchaWidgetRef {
  resetCaptcha: () => void;
}

export const CaptchaWidget = forwardRef<CaptchaWidgetRef, CaptchaWidgetProps>(
  ({ onVerify, onExpire, onError }, ref) => {
    const captchaRef = useRef<HCaptcha>(null);

    useImperativeHandle(ref, () => ({
      resetCaptcha: () => {
        captchaRef.current?.resetCaptcha();
      },
    }));

    return (
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
    );
  }
);

CaptchaWidget.displayName = 'CaptchaWidget';
