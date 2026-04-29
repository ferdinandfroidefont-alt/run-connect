import { useState, useEffect, useCallback } from "react";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileResultRow } from "@/components/search/ProfileResultRow";
import { searchProfilesForQuery } from "@/components/search/searchQueries";
import type { ProfileSearchHit } from "@/components/search/searchQueries";

export const ProfilesTab = ({ searchQuery }: { searchQuery: string }) => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchProfilesForQuery(supabase, user?.id, q);
      setProfiles(data);
    } catch (e) {
      console.error(e);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.id]);

  useEffect(() => {
    const t = window.setTimeout(() => void run(), 300);
    return () => clearTimeout(t);
  }, [run]);

  if (loading && profiles.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center px-6 pb-12 pt-16 text-center">
        <User className="mb-4 h-14 w-14 text-muted-foreground/70" />
        <p className="text-[15px] font-semibold text-foreground">Personnes</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Entre un prénom, un nom ou un pseudo pour trouver des athlètes{" "}
          publics.
        </p>
      </div>
    );
  }

  if (!loading && profiles.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 pb-12 pt-16 text-center">
        <User className="mb-4 h-14 w-14 text-muted-foreground/70" />
        <p className="text-[15px] font-semibold text-foreground">Aucun profil</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Aucun résultat pour « {searchQuery.trim()} ».
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {profiles.map((p) => (
        <ProfileResultRow key={p.user_id} profile={p} />
      ))}
    </div>
  );
};
