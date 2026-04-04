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
          "flex min-w-0 items-center gap-2.5 bg-card px-ios-4 py-2.5 ios-shell:px-2.5",
          onClick && "cursor-pointer active:bg-secondary/80 transition-colors ios-interactive"
        )}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        {/* Icon in colored rounded square */}
        {Icon && (
          <div className={cn("ios-list-row-icon shrink-0", iconBgColor)}>
            <Icon className={cn("h-[18px] w-[18px]", iconColor)} />
          </div>
        )}
        
        {/* Content — min-w-0 + overflow-hidden pour ne pas pousser la colonne droite hors écran (iOS) */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-[17px] leading-snug text-foreground">{title}</p>
          {subtitle && (
            <p className="mt-px line-clamp-2 text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {/* Right side : valeur tronquée + chevron toujours visible */}
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-ios-2">
          {value && (
            <span className="min-w-0 max-w-[min(11rem,42vw)] overflow-hidden text-ellipsis whitespace-nowrap text-right text-[17px] text-muted-foreground sm:max-w-[14rem]">
              {value}
            </span>
          )}
          {rightElement}
          {showChevron && onClick && (
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
          )}
        </div>
      </div>
      
      {/* iOS-style inset separator */}
      {showSeparator && (
        <div className="absolute bottom-0 left-[38px] right-0 h-px bg-border" />
      )}
    </div>
  );
};

interface IOSListGroupProps {
  children: React.ReactNode;
  header?: string;
  footer?: string;
  className?: string;
  flush?: boolean;
}

export const IOSListGroup = ({ children, header, footer, className, flush }: IOSListGroupProps) => {
  return (
    <div className={cn("mb-3", className)}>
      {header && (
        <p className="px-ios-4 pb-1.5 text-[13px] font-medium uppercase tracking-wide text-muted-foreground ios-shell:px-2.5">
          {header}
        </p>
      )}
      <div className={cn("bg-card overflow-hidden", flush ? "rounded-none" : "rounded-ios-md")}>
        {children}
      </div>
      {footer && (
        <p className="px-ios-4 pt-1.5 text-[13px] text-muted-foreground ios-shell:px-2.5">
          {footer}
        </p>
      )}
    </div>
  );
};
