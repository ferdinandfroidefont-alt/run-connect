import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { isReallyNative } from '@/lib/nativeDetection';
import { bootLog } from '@/lib/onScreenLogCapture';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Empêche une erreur React enfant de laisser l’écran entièrement blanc.
 */
export class BootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erreur inconnue' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    bootLog('[BootErrorBoundary] componentDidCatch', {
      message: error?.message ?? 'unknown',
      stack: info.componentStack,
    });
    console.error('[BootErrorBoundary] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const showTech = import.meta.env.DEV || isReallyNative();
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-background text-foreground">
          <div className="text-center space-y-2 max-w-sm">
            <p className="text-lg font-semibold">Impossible d&apos;afficher l&apos;application</p>
            <p className="text-sm text-muted-foreground">
              Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou vérifier votre connexion.
            </p>
          </div>
          {showTech && this.state.message ? (
            <pre className="max-h-[40vh] w-full max-w-lg overflow-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-[11px] leading-snug text-muted-foreground">
              {this.state.message}
            </pre>
          ) : null}
          <Button type="button" onClick={() => window.location.reload()}>
            Recharger l&apos;application
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
