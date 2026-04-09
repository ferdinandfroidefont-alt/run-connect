import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

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
    console.error('[BootErrorBoundary] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground">
          <div className="text-center space-y-2 max-w-sm">
            <p className="text-lg font-semibold">Impossible d&apos;afficher l&apos;application</p>
            <p className="text-sm text-muted-foreground">
              Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou vérifier votre connexion.
            </p>
          </div>
          <Button type="button" onClick={() => window.location.reload()}>
            Recharger l&apos;application
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
