import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SessionMode } from './types';

interface SessionModeSwitchProps {
  mode: SessionMode;
  onChange: (mode: SessionMode) => void;
}

export const SessionModeSwitch: React.FC<SessionModeSwitchProps> = ({ mode, onChange }) => {
  return (
    <div className="bg-secondary rounded-xl p-1 flex relative">
      {/* Animated background */}
      <motion.div
        className="absolute top-1 bottom-1 bg-card rounded-lg shadow-sm"
        initial={false}
        animate={{
          left: mode === 'simple' ? '4px' : '50%',
          right: mode === 'simple' ? '50%' : '4px',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors",
          mode === 'simple'
            ? "text-foreground"
            : "text-muted-foreground"
        )}
      >
        Simple
      </button>
      <button
        type="button"
        onClick={() => onChange('structured')}
        className={cn(
          "relative z-10 flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors",
          mode === 'structured'
            ? "text-foreground"
            : "text-muted-foreground"
        )}
      >
        Structurée
      </button>
    </div>
  );
};
