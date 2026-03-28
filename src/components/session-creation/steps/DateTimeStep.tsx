import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DateTimeStepProps {
  scheduledAt: string;
  onScheduledAtChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// Popular time slots
const TIME_SUGGESTIONS = [
  { label: 'Matin tôt', time: '07:00', icon: '🌅' },
  { label: 'Matin', time: '09:00', icon: '☀️' },
  { label: 'Midi', time: '12:30', icon: '🌞' },
  { label: 'Après-midi', time: '15:00', icon: '🏃' },
  { label: 'Fin de journée', time: '18:00', icon: '🌆' },
  { label: 'Soir', time: '20:00', icon: '🌙' },
];

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  scheduledAt,
  onScheduledAtChange,
  onNext,
  onBack,
}) => {
  const selectedDate = scheduledAt ? scheduledAt.split('T')[0] : '';
  const selectedTime = scheduledAt ? scheduledAt.split('T')[1] || '' : '';

  const handleDateChange = (date: string) => {
    const time = selectedTime || '09:00';
    onScheduledAtChange(`${date}T${time}`);
  };

  const handleTimeChange = (time: string) => {
    const date = selectedDate || new Date().toISOString().split('T')[0];
    onScheduledAtChange(`${date}T${time}`);
  };

  const handleTimeSuggestion = (time: string) => {
    const date = selectedDate || new Date().toISOString().split('T')[0];
    onScheduledAtChange(`${date}T${time}`);
  };

  // Quick date buttons
  const getQuickDates = () => {
    const today = new Date();
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return dates;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Quand ?</h2>
        <p className="text-muted-foreground mt-2">Choisissez la date et l'heure de votre séance</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Quick date selection */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">Date</Label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {getQuickDates().map((d) => (
              <motion.button
                key={d.date}
                onClick={() => handleDateChange(d.date)}
                className={cn(
                  "flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all min-w-[80px]",
                  selectedDate === d.date
                    ? "bg-primary text-primary-foreground"
                    : d.isWeekend
                      ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                      : "bg-white/5 hover:bg-white/10"
                )}
                whileTap={{ scale: 0.95 }}
              >
                {d.label}
              </motion.button>
            ))}
          </div>
          
          {/* Full date picker */}
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="mt-3 h-12"
          />
        </div>

        {/* Time suggestions */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">Heure suggérée</Label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SUGGESTIONS.map((suggestion) => (
              <motion.button
                key={suggestion.time}
                onClick={() => handleTimeSuggestion(suggestion.time)}
                className={cn(
                  "flex flex-col items-center p-3 rounded-xl transition-all",
                  selectedTime === suggestion.time
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 hover:bg-white/10"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-xl mb-1">{suggestion.icon}</span>
                <span className="text-xs font-medium">{suggestion.label}</span>
                <span className="text-xs opacity-70">{suggestion.time}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Custom time */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">Heure personnalisée</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Summary */}
        {scheduledAt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(scheduledAt).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  à {new Date(scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-auto pt-4">
        <Button variant="outline" onClick={onBack} className="h-14">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          onClick={onNext}
          disabled={!scheduledAt}
          className="flex-1 h-14 text-lg font-semibold"
        >
          Continuer
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};
