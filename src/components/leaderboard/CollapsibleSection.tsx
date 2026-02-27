import { useState, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  iconBg?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export const CollapsibleSection = ({ title, icon, iconBg = "bg-primary", children, defaultOpen = false }: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors"
      >
        <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        <span className="flex-1 text-left text-[17px] font-semibold text-foreground">{title}</span>
        <ChevronRight className={cn("h-5 w-5 text-muted-foreground/50 transition-transform duration-200", open && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
