import { Settings } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StreakBadge } from "@/components/StreakBadge";

const NotificationCenter = lazy(() =>
  import("@/components/NotificationCenter").then((m) => ({ default: m.NotificationCenter }))
);

export type FeedMode = "friends" | "discover";

interface FeedHeaderHeroProps {
  onProfileClick?: () => void;
}

/** Rangée RunConnect + avatar (grand titre / zone haute scrollable). */
export function FeedHeaderHero({ onProfileClick }: FeedHeaderHeroProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    username: string | null;
    display_name: string | null;
  }>({
    avatar_url: null,
    username: null,
    display_name: null,
  });

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, username, display_name")
        .eq("user_id", user.id)
        .single();

      if (data) setProfile(data);
    };

    void fetchProfile();
  }, [user]);

  return (
    <div className="relative flex min-h-[3rem] items-center justify-between gap-2 pb-1">
      <span className="flex min-w-0 shrink select-none items-center text-lg font-semibold leading-none tracking-tight text-primary">
        RunConnect
      </span>

      {profile && (
        <div className="absolute left-1/2 z-[1] flex -translate-x-1/2 [isolation:isolate]">
          <div
            role="button"
            tabIndex={0}
            onClick={onProfileClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onProfileClick?.();
              }
            }}
            className="relative flex cursor-pointer flex-col items-center outline-none transition-opacity duration-200 hover:opacity-95 active:opacity-85"
          >
            <Avatar className="map-header-profile-avatar avatar-fixed h-14 w-14 ring-2 ring-primary/15 transition-[box-shadow] duration-200 hover:ring-primary/35">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.username || profile.display_name || "Profile"}
                className="block h-full min-h-0 w-full min-w-0 object-cover object-center"
              />
              <AvatarFallback className="text-2xl font-semibold">
                {(profile.username || profile.display_name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user && (
              <div className="absolute -bottom-1 -right-1 scale-75">
                <StreakBadge userId={user.id} variant="compact" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-10 w-10 shrink-0" aria-hidden />
    </div>
  );
}

interface FeedHeaderTrailingProps {
  onSettingsClick?: () => void;
}

/** Cloche + réglages (barre fixe). */
export function FeedHeaderTrailing({ onSettingsClick }: FeedHeaderTrailingProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="flex shrink-0 items-center justify-center">
        <Suspense
          fallback={
            <div
              className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-border bg-card shadow-sm dark:border-[#1f1f1f]"
              aria-hidden
            />
          }
        >
          <NotificationCenter />
        </Suspense>
      </div>
      <button
        type="button"
        className={cn(
          "flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[13px] outline-none",
          "border border-transparent bg-secondary/80 text-foreground transition-[opacity,transform] duration-200",
          "active:scale-[0.97] active:opacity-80 dark:border-[#1f1f1f] dark:bg-[#1a1a1a]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label="Paramètres"
        onClick={onSettingsClick}
      >
        <Settings className="h-[22px] w-[22px]" strokeWidth={1.85} />
      </button>
    </div>
  );
}

interface FeedModeSwitcherProps {
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export function FeedModeSwitcher({ mode, onModeChange }: FeedModeSwitcherProps) {
  return (
    <div className="border-b border-border/40 bg-secondary px-4 pb-3 pt-1">
      <div className="flex rounded-[9px] bg-muted/60 p-[2px] dark:bg-muted/30">
        <button
          type="button"
          onClick={() => onModeChange("friends")}
          className={cn(
            "flex-1 rounded-[7px] py-2 text-[13px] font-semibold transition-all",
            mode === "friends" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          Amis
        </button>
        <button
          type="button"
          onClick={() => onModeChange("discover")}
          className={cn(
            "flex-1 rounded-[7px] py-2 text-[13px] font-semibold transition-all",
            mode === "discover" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          Découvrir
        </button>
      </div>
    </div>
  );
}
