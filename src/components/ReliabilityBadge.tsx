import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ReliabilityBadgeProps {
  rate: number;
  className?: string;
}

export const ReliabilityBadge = ({ rate, className = '' }: ReliabilityBadgeProps) => {
  const getConfig = (rate: number) => {
    if (rate >= 95) {
      return {
        label: 'Très fiable',
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: 'bg-green-500',
        variant: 'default' as const,
        textColor: 'text-green-500'
      };
    } else if (rate >= 80) {
      return {
        label: 'Régulier',
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: 'bg-blue-500',
        variant: 'secondary' as const,
        textColor: 'text-blue-500'
      };
    } else if (rate >= 60) {
      return {
        label: 'Occasionnel',
        icon: <AlertTriangle className="h-3 w-3" />,
        color: 'bg-orange-500',
        variant: 'outline' as const,
        textColor: 'text-orange-500'
      };
    } else {
      return {
        label: 'Peu fiable',
        icon: <XCircle className="h-3 w-3" />,
        color: 'bg-red-500',
        variant: 'destructive' as const,
        textColor: 'text-red-500'
      };
    }
  };

  const config = getConfig(rate);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Fiabilité</span>
          <span className={`text-sm font-bold ${config.textColor}`}>
            {rate.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${config.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    </div>
  );
};
