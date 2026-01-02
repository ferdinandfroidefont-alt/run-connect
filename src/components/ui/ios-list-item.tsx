import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IOSListItemProps {
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onClick?: () => void;
  showChevron?: boolean;
  showSeparator?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export const IOSListItem = ({
  icon: Icon,
  iconBgColor = "bg-primary",
  iconColor = "text-white",
  title,
  subtitle,
  value,
  onClick,
  showChevron = true,
  showSeparator = true,
  rightElement,
  className
}: IOSListItemProps) => {
  return (
    <div className={cn("relative", className)}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 bg-card",
          onClick && "cursor-pointer active:bg-secondary transition-colors"
        )}
      >
        {/* Icon in colored rounded square */}
        {Icon && (
          <div className={cn(
            "h-[30px] w-[30px] rounded-[7px] flex items-center justify-center flex-shrink-0",
            iconBgColor
          )}>
            <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[17px] text-foreground leading-tight">{title}</p>
          {subtitle && (
            <p className="text-[13px] text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {value && (
            <span className="text-[17px] text-muted-foreground">{value}</span>
          )}
          {rightElement}
          {showChevron && onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          )}
        </div>
      </div>
      
      {/* iOS-style inset separator */}
      {showSeparator && (
        <div className="absolute bottom-0 left-[52px] right-0 h-px bg-border" />
      )}
    </div>
  );
};

interface IOSListGroupProps {
  children: React.ReactNode;
  header?: string;
  footer?: string;
  className?: string;
}

export const IOSListGroup = ({ children, header, footer, className }: IOSListGroupProps) => {
  return (
    <div className={cn("mb-6", className)}>
      {header && (
        <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 pb-2">
          {header}
        </p>
      )}
      <div className="bg-card rounded-[10px] overflow-hidden">
        {children}
      </div>
      {footer && (
        <p className="text-[13px] text-muted-foreground px-4 pt-2">
          {footer}
        </p>
      )}
    </div>
  );
};
