import { Crown, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SubscriptionStatus } from '@/hooks/useSubscription';

interface SubscriptionBadgeProps {
  status: SubscriptionStatus;
  tier?: string | null;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SubscriptionBadge = ({ 
  status, 
  tier, 
  className, 
  showIcon = true,
  size = 'md' 
}: SubscriptionBadgeProps) => {
  if (status === 'loading' || status === 'free') {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getBadgeConfig = () => {
    switch (status) {
      case 'premium':
        return {
          label: tier === 'Admin' ? 'Admin' : 'Premium',
          icon: Crown,
          variant: 'default' as const,
          className: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-yellow-400 shadow-lg shadow-yellow-500/20',
        };
      case 'expiring_soon':
        return {
          label: 'Expire bientôt',
          icon: Clock,
          variant: 'outline' as const,
          className: 'border-orange-400 text-orange-600 bg-orange-50',
        };
      case 'past_due':
        return {
          label: 'Paiement en attente',
          icon: AlertTriangle,
          variant: 'outline' as const,
          className: 'border-red-400 text-red-600 bg-red-50',
        };
      case 'expired':
        return {
          label: 'Expiré',
          icon: XCircle,
          variant: 'destructive' as const,
          className: 'bg-red-500 text-white',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'font-medium flex items-center gap-1.5 animate-in fade-in-50',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
};

// Mini version for compact displays
export const SubscriptionBadgeMini = ({ 
  status,
  className 
}: { 
  status: SubscriptionStatus;
  className?: string;
}) => {
  if (status === 'loading' || status === 'free') {
    return null;
  }

  const isPremium = status === 'premium' || status === 'expiring_soon';
  
  return (
    <div 
      className={cn(
        'flex items-center justify-center rounded-full p-1',
        isPremium 
          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/30' 
          : 'bg-red-500',
        className
      )}
    >
      <Crown className="h-3 w-3 text-white" />
    </div>
  );
};
