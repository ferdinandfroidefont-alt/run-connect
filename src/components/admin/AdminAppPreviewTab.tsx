import { useState, useMemo, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Play, MapPin, MessageCircle, GraduationCap, User, Share2, Film, Calendar, LayoutList, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import {
  type PreviewIdentity,
  type PreviewRole,
  applyPreset,
  buildDisplayName,
  createEmptyPreviewIdentity,
} from "@/lib/previewIdentity";
import { COUNTRY_LABELS } from "@/lib/countryLabels";
import { cn } from "@/lib/utils";

const SPORT_OPTIONS = [
  { value: "running", label: "Course" },
  { value: "cycling", label: "Vélo" },
  { value: "swimming", label: "Natation" },
  { value: "triathlon", label: "Triathlon" },
  { value: "walking", label: "Marche" },
  { value: "trail", label: "Trail" },
];

const PRESET_CHIPS: { id: string; label: string }[] = [
  { id: "nouveau", label: "Nouveau membre" },
  { id: "vide", label: "Profil vide" },
  { id: "coureur", label: "Coureur confirmé" },
  { id: "coach", label: "Coach" },
  { id: "athlete_coached", label: "Athlète coaché" },
  { id: "premium", label: "Premium" },
  { id: "nomLong", label: "Nom très long" },
  { id: "bioLongue", label: "Bio très longue" },
  { id: "sansPhoto", label: "Sans photo" },
];

type AdminAppPreviewTabProps = {
  onClose: () => void;
};

export function AdminAppPreviewTab({ onClose }: AdminAppPreviewTabProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { enterPreview, isPreviewMode, exitPreview } = useAppPreview();

  const [draft, setDraft] = useState<PreviewIdentity>(() => createEmptyPreviewIdentity());

  const countryOptions = useMemo(() => Object.keys(COUNTRY_LABELS).sort(), []);

  const update = <K extends keyof PreviewIdentity>(key: K, value: PreviewIdentity[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleLaunch = () => {
    if (!user?.id) return;
    const ok = enterPreview(
      {
        ...draft,
        preview_mode: true,
        is_test: true,
        created_by_admin: true,
      },
      { email: user.email, username: userProfile?.username ?? null }
    );
    if (!ok) {
      toast({
        title: "Accès refusé",
        description: "Réservé au compte administrateur créateur.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Aperçu activé",
      description: `Vous naviguez en tant que ${buildDisplayName(draft)} (@${draft.username}).`,
    });
    onClose();
    navigate("/", { replace: true });
  };

  const shortcut = (path: string, state?: Record<string, unknown>) => {
    if (!isPreviewMode) {
      toast({
        title: "Lancez d’abord l’aperçu",
        description: "Utilisez « Lancer l’aperçu », puis ces raccourcis.",
        variant: "destructive",
      });
      return;
    }
    navigate(path, { state: state ?? undefined });
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      <div className="flex items-start gap-3 rounded-[14px] border border-primary/20 bg-primary/[0.06] px-3.5 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/15 text-primary">
          <Eye className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-foreground">Aperçu app</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Identité fictive stockée localement (session). Aucun compte invité créé en base. Les actions
            d’écriture sensibles sont bloquées avec un message explicite.
          </p>
        </div>
      </div>

      {isPreviewMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5">
          <span className="text-[12px] font-medium text-foreground">Un aperçu est déjà actif.</span>
          <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => exitPreview()}>
            Quitter l’aperçu
          </Button>
        </div>
      )}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Presets</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDraft(applyPreset(c.id))}
              className={cn(
                "rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors",
                "active:bg-secondary"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pv-first">Prénom</Label>
          <Input
            id="pv-first"
            value={draft.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className="h-10 rounded-[10px]"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-last">Nom</Label>
          <Input
            id="pv-last"
            value={draft.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className="h-10 rounded-[10px]"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pv-user">Nom d&apos;utilisateur</Label>
          <Input
            id="pv-user"
            value={draft.username}
            onChange={(e) => update("username", e.target.value.replace(/\s+/g, "").toLowerCase())}
            className="h-10 rounded-[10px]"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pv-avatar">URL photo</Label>
          <Input
            id="pv-avatar"
            value={draft.avatarUrl ?? ""}
            onChange={(e) => update("avatarUrl", e.target.value.trim() || null)}
            placeholder="https://… ou vide"
            className="h-10 rounded-[10px]"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pv-bio">Bio</Label>
          <Textarea
            id="pv-bio"
            value={draft.bio ?? ""}
            onChange={(e) => update("bio", e.target.value || null)}
            rows={3}
            className="min-h-[80px] rounded-[12px] resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-city">Ville</Label>
          <Input
            id="pv-city"
            value={draft.city ?? ""}
            onChange={(e) => update("city", e.target.value.trim() || null)}
            className="h-10 rounded-[10px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-country">Pays (code)</Label>
          <select
            id="pv-country"
            value={draft.countryCode ?? ""}
            onChange={(e) => update("countryCode", e.target.value || null)}
            className="flex h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[15px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {countryOptions.map((code) => (
              <option key={code} value={code}>
                {COUNTRY_LABELS[code] ?? code}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-sport">Sport principal</Label>
          <select
            id="pv-sport"
            value={draft.favoriteSport ?? ""}
            onChange={(e) => update("favoriteSport", e.target.value || null)}
            className="flex h-10 w-full rounded-[10px] border border-input bg-background px-3 text-[15px]"
          >
            <option value="">—</option>
            {SPORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-age">Âge</Label>
          <Input
            id="pv-age"
            type="number"
            min={0}
            max={120}
            value={draft.age ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update("age", v === "" ? null : Math.min(120, Math.max(0, parseInt(v, 10) || 0)));
            }}
            className="h-10 rounded-[10px]"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border/50 bg-card/80 px-3 py-2.5 sm:col-span-2">
          <div>
            <p className="text-[14px] font-medium">Premium</p>
            <p className="text-[11px] text-muted-foreground">Badge + options liées à l’abonnement</p>
          </div>
          <Switch checked={draft.isPremium} onCheckedChange={(c) => update("isPremium", c)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Rôle (aperçu UI)</Label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["athlete", "Athlète"],
                ["coach", "Coach"],
                ["both", "Les deux"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => update("role", val as PreviewRole)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  draft.role === val
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground active:bg-secondary"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="h-12 w-full rounded-[14px] text-[16px] font-semibold shadow-md"
        onClick={handleLaunch}
      >
        <Play className="mr-2 h-5 w-5" />
        Lancer l’aperçu
      </Button>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Raccourcis (aperçu actif)
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <PreviewShortcut
            icon={User}
            label="Profil"
            onClick={() => shortcut("/", { openProfileDialog: true })}
          />
          <PreviewShortcut icon={MapPin} label="Carte" onClick={() => shortcut("/")} />
          <PreviewShortcut icon={Film} label="Story" onClick={() => shortcut("/stories/create")} />
          <PreviewShortcut
            icon={Share2}
            label="Partage profil"
            onClick={() => shortcut("/", { openSettingsDialog: true })}
          />
          <PreviewShortcut icon={GraduationCap} label="Coaching" onClick={() => shortcut("/coaching")} />
          <PreviewShortcut icon={MessageCircle} label="Messages" onClick={() => shortcut("/messages")} />
          <PreviewShortcut icon={Calendar} label="Mes séances" onClick={() => shortcut("/my-sessions")} />
          <PreviewShortcut
            icon={LayoutList}
            label="État vide (liste)"
            onClick={() => {
              shortcut("/messages");
              toast({
                title: "Astuce",
                description: "Ouvrez une conversation vide ou une section sans données pour tester le vide.",
              });
            }}
          />
          <PreviewShortcut
            icon={Sparkles}
            label="État chargé"
            onClick={() => {
              shortcut("/");
              toast({
                title: "Astuce",
                description: "L’accueil et le fil chargent vos vraies données ; seul le profil affiché est fictif.",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewShortcut({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[12px] border border-border/50 bg-card px-2.5 py-2.5 text-left text-[12px] font-medium shadow-sm transition-colors active:bg-secondary"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="leading-snug">{label}</span>
    </button>
  );
}
