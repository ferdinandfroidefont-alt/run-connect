import { useNavigate } from "react-router-dom";
import { Dumbbell, MessageCircle, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Coaching() {
  const navigate = useNavigate();

  return (
    <div className="fixed-fill-with-bottom-nav overflow-y-auto bg-secondary">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-[calc(1.25rem+var(--safe-area-bottom))] pt-[max(1rem,var(--safe-area-top))]">
        <header className="ios-card border border-border/60 px-ios-4 py-ios-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-primary/12 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-semibold text-foreground">Coaching</h1>
              <p className="text-sm text-muted-foreground">Espace coach et suivi personnalise</p>
            </div>
          </div>
        </header>

        <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
          <h2 className="text-[16px] font-semibold text-foreground">Acces rapide</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button className="justify-start gap-2" variant="secondary" onClick={() => navigate("/messages")}>
              <MessageCircle className="h-4 w-4" />
              Conversations
            </Button>
            <Button className="justify-start gap-2" variant="secondary" onClick={() => navigate("/my-sessions")}>
              <Calendar className="h-4 w-4" />
              Mes seances
            </Button>
          </div>
        </section>

        <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-blue-500/12 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">Mode coaching club</h3>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">
                Ouvre une fiche de club pour acceder aux plans hebdo, aux seances coaching et aux templates.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
