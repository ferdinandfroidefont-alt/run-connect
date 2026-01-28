import { cn } from '@/lib/utils';
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SessionLevelBadgeProps {
  level: SessionLevel;
  variant?: 'compact' | 'full' | 'dot';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export const SessionLevelBadge = ({
  level,
  variant = 'compact',
  size = 'md',
  showTooltip = true,
  className,
}: SessionLevelBadgeProps) => {
  const config = LEVEL_CONFIG[level];
  
  const sizeClasses = {
    sm: {
      dot: 'w-2 h-2',
      compact: 'w-5 h-5 text-[10px]',
      full: 'px-2 py-0.5 text-[10px]',
    },
    md: {
      dot: 'w-3 h-3',
      compact: 'w-6 h-6 text-[11px]',
      full: 'px-2.5 py-1 text-[11px]',
    },
    lg: {
      dot: 'w-4 h-4',
      compact: 'w-8 h-8 text-[13px]',
      full: 'px-3 py-1.5 text-[13px]',
    },
  };

  const renderBadge = () => {
    if (variant === 'dot') {
      return (
        <div
          className={cn(
            'rounded-full',
            sizeClasses[size].dot,
            className
          )}
          style={{ backgroundColor: config.color }}
        />
      );
    }

    if (variant === 'compact') {
      return (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white',
            sizeClasses[size].compact,
            className
          )}
          style={{ backgroundColor: config.color }}
        >
          {level}
        </div>
      );
    }

    // full variant
    return (
      <div
        className={cn(
          'rounded-full flex items-center gap-1.5 font-medium text-white whitespace-nowrap',
          sizeClasses[size].full,
          className
        )}
        style={{ backgroundColor: config.color }}
      >
        <span className="font-semibold">{level}</span>
        <span>{config.label}</span>
      </div>
    );
  };

  if (!showTooltip || variant === 'full') {
    return renderBadge();
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {renderBadge()}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[12px]">
          <p>Niveau {level} - {config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
