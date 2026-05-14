import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Isole une erreur de rendu d’un onglet du swipe (ex. Messages) pour ne pas faire tomber
 * tout le {@link MainTabsSwipeHost} ni l’onglet voisin (ex. Mes séances).
 */
export class TabPaneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[TabPaneErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 bg-background px-4 py-8">
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden />
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            Impossible d’afficher cet onglet. Réessayez ; si le problème continue, rechargez
            l’application.
          </p>
          <Button type="button" variant="default" onClick={this.handleRetry}>
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
