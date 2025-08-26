import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSoundSettings } from '@/contexts/SoundContext';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

export const SoundSettings: React.FC = () => {
  const { soundEnabled, setSoundEnabled } = useSoundSettings();
  const { playClickSound } = useSoundFeedback();

  const handleToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (enabled) {
      // Play a sound to demonstrate the feature
      setTimeout(() => playClickSound(), 100);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <Label htmlFor="sound-feedback" className="text-sm font-medium">
          Retour sonore
        </Label>
        <p className="text-xs text-muted-foreground">
          Son discret lors des interactions avec les boutons
        </p>
      </div>
      <Switch
        id="sound-feedback"
        checked={soundEnabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
};