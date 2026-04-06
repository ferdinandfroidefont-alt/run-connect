import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getProfileCompleteness,
  type ProfileCompletenessHint,
  type ProfileCompletenessInput,
} from "@/lib/profileCompleteness";

function hintToKey(h: ProfileCompletenessHint): string {
  const map: Record<ProfileCompletenessHint, string> = {
    avatar: "profilePage.hintAvatar",
    display_name: "profilePage.hintDisplayName",
    bio: "profilePage.hintBio",
    country: "profilePage.hintCountry",
    age: "profilePage.hintAge",
    favorite_sport: "profilePage.hintSports",
    cover: "profilePage.hintCover",
  };
  return map[h];
}

type Props = {
  profile: ProfileCompletenessInput | null;
  onEditProfile: () => void;
};

export function ProfileCompletenessBanner({ profile, onEditProfile }: Props) {
  const { t } = useLanguage();
  const { percent, missingHints } = useMemo(() => getProfileCompleteness(profile), [profile]);

  if (percent >= 100 || missingHints.length === 0) {
    return null;
  }

  const lines = missingHints
    .slice(0, 3)
    .map((h) => t(hintToKey(h)))
    .filter(Boolean);

  const subtitle = t("profilePage.completenessSubtitle")
    .replace("{{percent}}", String(percent))
    .replace("{{hints}}", lines.join(", "));

  return (
    <div className="border-b border-border/60 bg-card px-4 py-3 ios-shell:px-2.5">
      <div className="ios-card flex min-w-0 flex-col gap-2 rounded-[12px] border border-border/50 bg-muted/30 p-3">
        <p className="text-ios-subheadline font-semibold text-foreground">{t("profilePage.completenessTitle")}</p>
        <p className="text-ios-footnote leading-snug text-muted-foreground">{subtitle}</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 w-full shrink-0 rounded-[10px] text-ios-footnote font-medium"
          onClick={onEditProfile}
        >
          {t("profilePage.completenessCta")}
        </Button>
      </div>
    </div>
  );
}
