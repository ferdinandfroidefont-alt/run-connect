import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReliabilityBadgeProps {
  rate: number;
  className?: string;
  onClick?: () => void;
}

export const ReliabilityBadge = ({ rate, className = '', onClick }: ReliabilityBadgeProps) => {
  const { t } = useLanguage();
  
  const getConfig = (rate: number) => {
    if (rate >= 95) {
      return {
        label: t('reliability.veryReliable'),
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: 'bg-green-500',
        variant: 'default' as const,
        textColor: 'text-green-500'
      };
    } else if (rate >= 80) {
      return {
        label: t('reliability.regular'),
        icon: <CheckCircle2 className="h-3 w-3" />,
        color: 'bg-blue-500',
        variant: 'secondary' as const,
        textColor: 'text-blue-500'
      };
    } else if (rate >= 60) {
      return {
        label: t('reliability.occasional'),
        icon: <AlertTriangle className="h-3 w-3" />,
        color: 'bg-orange-500',
        variant: 'outline' as const,
        textColor: 'text-orange-500'
      };
    } else {
      return {
        label: t('reliability.unreliable'),
        icon: <XCircle className="h-3 w-3" />,
        color: 'bg-red-500',
        variant: 'destructive' as const,
        textColor: 'text-red-500'
      };
    }
  };

  const config = getConfig(rate);

  return (
    <div 
      className={`flex items-center gap-3 ${className} ${onClick ? 'cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{t('reliability.label')}</span>
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
