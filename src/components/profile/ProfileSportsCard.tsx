import { useState } from 'react';
import { Dumbbell, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  PROFILE_SPORT_KEYS,
  PROFILE_SPORT_LABELS,
  type ProfileSportKey,
  parseProfileSports,
  profileSportDiscoverHint,
  serializeProfileSports,
} from '@/lib/profileSports';
import { getActivityEmoji, getDiscoverSportTileClass } from '@/lib/discoverSessionVisual';

export function ProfileSportChips({
  sportKeys,
  className,
  /** Aperçu dense (ex. bouton « Mes sports ») : puces compactes. */
  compact = false,
}: {
  sportKeys: ProfileSportKey[];
  className?: string;
  compact?: boolean;
}) {
  if (sportKeys.length === 0) return null;
  if (compact) {
    return (
      <div className={cn('flex flex-wrap justify-center gap-1.5', className)}>
        {sportKeys.map((key) => {
          const meta = PROFILE_SPORT_LABELS[key];
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-muted-foreground"
            >
              {meta.emoji} {meta.label}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'divide-y divide-border/50 dark:divide-[#1f1f1f]',
        className
      )}
      role="list"
    >
      {sportKeys.map((key) => {
        const meta = PROFILE_SPORT_LABELS[key];
        const hint = profileSportDiscoverHint(key);
        const emoji = getActivityEmoji(hint);
        const tile = getDiscoverSportTileClass(hint);
        return (
          <div
            key={key}
            role="listitem"
            className="flex min-h-[52px] w-full min-w-0 items-center gap-3 px-4 py-2.5 ios-shell:px-2.5"
          >
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[22px] leading-none text-white shadow-sm',
                tile
              )}
              aria-hidden
            >
              {emoji}
            </span>
            <span className="min-w-0 flex-1 text-[17px] leading-snug text-foreground">{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}

type ProfileSportsCardProps = {
  favoriteSport: string | null | undefined;
  isOwnProfile: boolean;
  /** Après sauvegarde depuis la carte (profil local + formulaire). */
  onUpdated?: (value: string | null) => void;
};

export function ProfileSportsCard({ favoriteSport, isOwnProfile, onUpdated }: ProfileSportsCardProps) {
  const { user } = useAuth();
  const { refreshProfile } = useUserProfile();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileSportKey[]>([]);
  const [saving, setSaving] = useState(false);

  const selected = parseProfileSports(favoriteSport);

  const openSheet = () => {
    setDraft([...selected]);
    setSheetOpen(true);
  };

  const toggle = (key: ProfileSportKey) => {
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const serialized = serializeProfileSports(draft);
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ favorite_sport: serialized })
        .eq('user_id', user.id);
      if (error) throw error;
      onUpdated?.(serialized);
      await refreshProfile();
      toast({ title: 'Sports enregistrés', description: 'Tes disciplines ont été mises à jour.' });
      setSheetOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOwnProfile) {
    if (selected.length === 0) return null;
    return (
      <div className="ios-card min-w-0 overflow-hidden rounded-ios-md border border-border/60 ios-shell:rounded-ios-md">
        <p className="border-b border-border/50 px-4 py-2.5 text-ios-footnote uppercase tracking-wide text-muted-foreground ios-shell:px-2.5">
          Sports
        </p>
        <ProfileSportChips sportKeys={selected} />
      </div>
    );
  }

  return (
    <>
      <div className="ios-card w-full min-w-0 overflow-hidden rounded-ios-md border border-border/60">
        <button
          type="button"
          onClick={openSheet}
          className="flex w-full min-w-0 items-center gap-ios-3 px-4 py-3 text-left transition-colors active:bg-secondary/60 ios-shell:px-2.5 ios-shell:py-2.5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ios-sm bg-[#FF6B00]">
            <Dumbbell className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ios-footnote text-muted-foreground">Mes sports</p>
            {selected.length === 0 ? (
              <p className="mt-0.5 text-ios-subheadline text-foreground">
                Indique les sports que tu pratiques
              </p>
            ) : (
              <div className="mt-ios-1 max-h-[200px] overflow-y-auto">
                <ProfileSportChips sportKeys={selected} compact />
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-ios-lg pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>Mes sports</SheetTitle>
            <p className="text-ios-subheadline font-normal text-muted-foreground">
              Sélectionne une ou plusieurs disciplines (comme à l&apos;inscription).
            </p>
          </SheetHeader>

          <div className="ios-list-stack mt-ios-4 max-h-[50vh] overflow-y-auto rounded-ios-lg border border-border">
            {PROFILE_SPORT_KEYS.map((key) => {
              const meta = PROFILE_SPORT_LABELS[key];
              const checked = draft.includes(key);
              return (
                <label
                  key={key}
                  className="flex w-full min-w-0 cursor-pointer items-center gap-ios-3 border-b border-border px-ios-4 py-ios-3 last:border-b-0 active:bg-secondary/50"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(key)} className="shrink-0" />
                  <span className="text-lg" aria-hidden>
                    {meta.emoji}
                  </span>
                  <span className="min-w-0 flex-1 text-ios-subheadline font-medium text-foreground">
                    {meta.label}
                  </span>
                </label>
              );
            })}
          </div>

          <SheetFooter className="mt-ios-4 flex-col gap-ios-2 sm:flex-col">
            <Button className="w-full rounded-ios-sm h-11" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-ios-sm h-11"
              onClick={() => setSheetOpen(false)}
            >
              Annuler
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
