import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACTIVITY_TYPES, SESSION_TYPES } from '../types';
import { cn } from '@/lib/utils';

interface ActivityStepProps {
  activityType: string;
  sessionType: string;
  onActivityChange: (activity: string) => void;
  onSessionTypeChange: (type: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ActivityStep: React.FC<ActivityStepProps> = ({
  activityType,
  sessionType,
  onActivityChange,
  onSessionTypeChange,
  onNext,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = ACTIVITY_TYPES.filter(activity =>
    activity.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group activities by category
  const popularActivities = filteredActivities.slice(0, 8);
  const otherActivities = filteredActivities.slice(8);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
          {activityType ? ACTIVITY_TYPES.find(a => a.value === activityType)?.icon : '🏃'}
        </div>
        <h2 className="text-2xl font-bold text-foreground">Quel sport ?</h2>
        <p className="text-muted-foreground mt-2">Choisissez l'activité de votre séance</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un sport..."
          className="pl-10 h-12"
        />
      </div>

      {/* Activity grid */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {/* Popular activities */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Populaires</h3>
          <div className="grid grid-cols-4 gap-2">
            {popularActivities.map((activity) => (
              <motion.button
                key={activity.value}
                onClick={() => onActivityChange(activity.value)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl transition-all",
                  activityType === activity.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 hover:bg-white/10"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl mb-1">{activity.icon}</span>
                <span className="text-xs font-medium text-center leading-tight">
                  {activity.label.replace(/^[^\s]+\s/, '')}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Other activities */}
        {otherActivities.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Autres sports</h3>
            <div className="grid grid-cols-4 gap-2">
              {otherActivities.map((activity) => (
                <motion.button
                  key={activity.value}
                  onClick={() => onActivityChange(activity.value)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl transition-all",
                    activityType === activity.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl mb-1">{activity.icon}</span>
                  <span className="text-xs font-medium text-center leading-tight">
                    {activity.label.replace(/^[^\s]+\s/, '')}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Session type */}
        {activityType && ['course', 'trail', 'velo', 'vtt', 'gravel', 'marche'].includes(activityType) && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Type de sortie</h3>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_TYPES.map((type) => (
                <motion.button
                  key={type.value}
                  onClick={() => onSessionTypeChange(type.value)}
                  className={cn(
                    "p-3 rounded-xl text-sm font-medium transition-all",
                    sessionType === type.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  {type.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-auto">
        <Button variant="outline" onClick={onBack} className="h-14">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          onClick={onNext}
          disabled={!activityType}
          className="flex-1 h-14 text-lg font-semibold"
        >
          Continuer
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};
