import type { ReactNode } from "react";
import { ArrowLeft, Building2, ChevronRight, FileText, Mail, Scale, Server, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  getLegalAddressLines,
  getLegalEntityName,
  getLegalHostingNotice,
  getLegalPublicationDirector,
  getLegalRcs,
  getLegalSiretOrSiren,
  getSupportEmail,
  getSupportMailtoHref,
  LEGAL_LAST_UPDATED_LABEL,
} from "@/lib/legalMeta";

function Placeholder({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

function SectionCard({
  icon: Icon,
  iconClass,
  title,
  children,
}: {
  icon: typeof Building2;
  iconClass: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="pl-0 sm:pl-[52px] space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function LegalNotice() {
  const navigate = useNavigate();
  const entity = getLegalEntityName();
  const addressLines = getLegalAddressLines();
  const siret = getLegalSiretOrSiren();
  const rcs = getLegalRcs();
  const director = getLegalPublicationDirector();
  const hosting = getLegalHostingNotice();

  return (
    <div className="fixed inset-0 bg-secondary flex flex-col overflow-x-hidden min-w-0">
      <header className="sticky top-0 z-10 bg-card border-b border-border/50 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => navigate(-1)}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">Mentions légales</h1>
            <p className="text-xs text-muted-foreground truncate">{entity}</p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 min-w-0">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 pb-28">
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <Scale className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            <span>Dernière mise à jour : {LEGAL_LAST_UPDATED_LABEL}</span>
          </p>

          <SectionCard icon={Building2} iconClass="bg-primary/10 text-primary" title="Éditeur">
            <p className="text-foreground font-medium">{entity}</p>
            <div className="space-y-1">
              {addressLines.length > 0 ? (
                addressLines.map((line, i) => <p key={i}>{line}</p>)
              ) : (
                <Placeholder>
                  Adresse du siège : renseigner <code className="text-xs not-italic">VITE_PUBLIC_LEGAL_ADDRESS</code>{" "}
                  (lignes séparées par <code className="text-xs not-italic">|</code>).
                </Placeholder>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Scale} iconClass="bg-muted text-foreground" title="Immatriculation">
            <ul className="space-y-2 list-none pl-0">
              <li>
                <span className="text-foreground font-medium">SIREN / SIRET : </span>
                {siret ?? (
                  <Placeholder>
                    À renseigner (<code className="text-xs not-italic">VITE_PUBLIC_LEGAL_SIRET</code>)
                  </Placeholder>
                )}
              </li>
              <li>
                <span className="text-foreground font-medium">RCS / RM : </span>
                {rcs ?? (
                  <Placeholder>
                    À renseigner (<code className="text-xs not-italic">VITE_PUBLIC_LEGAL_RCS</code>)
                  </Placeholder>
                )}
              </li>
            </ul>
          </SectionCard>

          <SectionCard icon={UserCircle} iconClass="bg-muted text-foreground" title="Directeur de la publication">
            {director ?? (
              <Placeholder>
                À renseigner (<code className="text-xs not-italic">VITE_PUBLIC_LEGAL_DIRECTOR</code>)
              </Placeholder>
            )}
          </SectionCard>

          <SectionCard icon={Mail} iconClass="bg-muted text-foreground" title="Contact">
            <a
              href={getSupportMailtoHref()}
              className="inline-flex text-primary font-medium hover:underline break-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
            >
              {getSupportEmail()}
            </a>
            <p className="text-xs pt-2 border-t border-border/50">
              Pour les données personnelles :{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2 font-medium"
                onClick={() => navigate("/privacy")}
              >
                politique de confidentialité
              </button>
              .
            </p>
          </SectionCard>

          <SectionCard icon={Server} iconClass="bg-muted text-foreground" title="Hébergement">
            <div className="whitespace-pre-line">
              {hosting ?? (
                <Placeholder>
                  Décrire l’hébergeur (nom, adresse, site) via{" "}
                  <code className="text-xs not-italic">VITE_PUBLIC_LEGAL_HOSTING</code>.
                </Placeholder>
              )}
            </div>
            <p className="text-xs pt-2 border-t border-border/50">
              Les données applicatives peuvent être traitées par des prestataires (base de données, auth, notifications)
              détaillés dans la politique de confidentialité.
            </p>
          </SectionCard>

          <section className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Propriété intellectuelle</p>
            <p>
              L’application RunConnect, son interface, ses textes, logos et marques sont protégés. Toute reproduction ou
              exploitation non autorisée est interdite.
            </p>
          </section>

          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 pb-2">
              Autres documents
            </p>
            <button
              type="button"
              onClick={() => navigate("/terms")}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors border-t border-border/50"
            >
              <span className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden />
                <span className="text-sm font-medium text-foreground truncate">Conditions d&apos;utilisation</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors border-t border-border/50"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Shield className="h-5 w-5 text-green-600 shrink-0" aria-hidden />
                <span className="text-sm font-medium text-foreground truncate">Politique de confidentialité</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" aria-hidden />
            </button>
          </div>

          <Button type="button" onClick={() => navigate(-1)} size="lg" className="w-full" variant="secondary">
            Retour
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
