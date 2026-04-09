import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { bootLog } from '@/lib/onScreenLogCapture';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string | null };

/**
 * Empêche une erreur de rendu / enfant de laisser l’écran entièrement blanc.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erreur inattendue' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    bootLog('[AppErrorBoundary] componentDidCatch', {
      message: error?.message ?? 'unknown',
      stack: info.componentStack,
    });
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  /** Réessaie le rendu sans rechargement complet (garde session / cache mémoire). */
  handleRetry = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 safe-inset-top-once safe-inset-bottom-once">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground text-center">Un problème est survenu</h1>
          <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
            L’application n’a pas pu afficher cette vue. Réessayez ou rechargez complètement.
          </p>
          {import.meta.env.DEV && this.state.message && (
            <pre className="mt-4 text-xs text-muted-foreground max-w-md overflow-auto p-2 bg-muted rounded-md">
              {this.state.message}
            </pre>
          )}
          <div className="mt-8 flex flex-col gap-ios-3 sm:flex-row">
            <Button type="button" variant="default" className="gap-2" onClick={this.handleRetry}>
              Réessayer
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4" />
              Recharger l’application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
