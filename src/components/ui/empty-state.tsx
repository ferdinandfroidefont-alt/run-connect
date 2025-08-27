import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  animate?: boolean;
}

export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  className,
  animate = true 
}: EmptyStateProps) => {
  return (
    <Card className={cn("border-dashed border-2", className)}>
      <CardContent className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-4",
        animate && "animate-fade-in"
      )}>
        {icon && (
          <div className={cn(
            "text-muted-foreground",
            animate && "animate-gentle-bounce"
          )}>
            {icon}
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          )}
        </div>
        
        {action && (
          <Button 
            onClick={action.onClick}
            className="btn-interactive mt-4"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};