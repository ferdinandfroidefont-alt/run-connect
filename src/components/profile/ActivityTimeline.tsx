import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, MapPin, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

interface ActivityEvent {
  id: string;
  type: 'joined' | 'created' | 'badge' | 'follow';
  title: string;
  description: string;
  date: string;
  icon: typeof Calendar;
  color: string;
}

interface ActivityTimelineProps {
  userId: string;
}

export const ActivityTimeline = ({ userId }: ActivityTimelineProps) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [userId]);

  const fetchActivity = async () => {
    try {
      const allEvents: ActivityEvent[] = [];

      // Fetch sessions joined
      const { data: joined } = await supabase
        .from('session_participants')
        .select('id, joined_at, sessions(title, activity_type, location_name)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(10);

      joined?.forEach((p: any) => {
        if (p.sessions) {
          allEvents.push({
            id: `joined-${p.id}`,
            type: 'joined',
            title: `A rejoint "${p.sessions.title}"`,
            description: p.sessions.location_name || p.sessions.activity_type,
            date: p.joined_at,
            icon: Users,
            color: 'bg-blue-500',
          });
        }
      });

      // Fetch sessions created
      const { data: created } = await supabase
        .from('sessions')
        .select('id, title, activity_type, location_name, created_at')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      created?.forEach((s) => {
        allEvents.push({
          id: `created-${s.id}`,
          type: 'created',
          title: `A organisé "${s.title}"`,
          description: s.location_name || s.activity_type,
          date: s.created_at,
          icon: MapPin,
          color: 'bg-green-500',
        });
      });

      // Fetch badges earned
      const { data: badges } = await supabase
        .from('user_badges')
        .select('id, badge_name, badge_description, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(5);

      badges?.forEach((b) => {
        allEvents.push({
          id: `badge-${b.id}`,
          type: 'badge',
          title: `Badge débloqué : ${b.badge_name}`,
          description: b.badge_description || '',
          date: b.unlocked_at || '',
          icon: Trophy,
          color: 'bg-yellow-500',
        });
      });

      // Fetch recent follows
      const { data: follows } = await supabase
        .from('user_follows')
        .select('id, created_at, following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(5);

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name')
          .in('user_id', followingIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        follows.forEach((f) => {
          const profile = profileMap.get(f.following_id);
          allEvents.push({
            id: `follow-${f.id}`,
            type: 'follow',
            title: `Suit ${profile?.display_name || profile?.username || 'un utilisateur'}`,
            description: `@${profile?.username || ''}`,
            date: f.created_at,
            icon: UserPlus,
            color: 'bg-purple-500',
          });
        });
      }

      // Sort all events by date descending
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(allEvents.slice(0, 15));
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card rounded-[10px]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-[15px] font-semibold">Activité récente</h3>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 bg-muted rounded" />
                  <div className="h-2 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-card rounded-[10px]">
        <CardContent className="p-4 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">Pas encore d'activité</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card rounded-[10px] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-[15px] font-semibold">Activité récente</h3>
          <Badge variant="secondary" className="text-[11px] ml-auto">
            {events.length} événements
          </Badge>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-border" />

          <div className="space-y-4">
            {events.map((event, index) => {
              const EventIcon = event.icon;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-3 relative"
                >
                  <div className={`h-[30px] w-[30px] rounded-full ${event.color} flex items-center justify-center flex-shrink-0 z-10`}>
                    <EventIcon className="h-[14px] w-[14px] text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-[14px] text-foreground leading-tight">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-[12px] text-muted-foreground truncate">
                        {event.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {event.date ? format(new Date(event.date), "d MMM yyyy 'à' HH:mm", { locale: fr }) : ''}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
