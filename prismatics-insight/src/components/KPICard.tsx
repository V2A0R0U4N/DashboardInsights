import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const kpiCardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground shadow-sm p-6 transition-all duration-300 hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-white/80 backdrop-blur-sm",
        purple: "bg-purple-500/10 border-purple-200 text-purple-800",
        teal: "bg-teal-500/10 border-teal-200 text-teal-800",
        pink: "bg-pink-500/10 border-pink-200 text-pink-800",
        success: "bg-green-500/10 border-green-200 text-green-800",
        warning: "bg-amber-500/10 border-amber-200 text-amber-800",
        destructive: "bg-red-500/10 border-red-200 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

import type { HTMLMotionProps } from "framer-motion";

export interface KPICardProps
  extends HTMLMotionProps<"div">,
    VariantProps<typeof kpiCardVariants> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tooltip?: string;
  isLoading?: boolean;
  delay?: number;
}

export default function KPICard({
  className,
  variant,
  title,
  value,
  subtitle,
  icon: Icon,
  tooltip,
  isLoading,
  delay = 0,
  ...props
}: KPICardProps) {
  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    ...motionSafeProps
  } = props;

  const stringValue = value?.toString() || "";
  const dynamicSize =
    stringValue.length > 10
      ? "text-xl"
      : stringValue.length > 7
      ? "text-2xl"
      : "text-3xl";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay / 1000 }}
            className={cn(kpiCardVariants({ variant, className }))}
            {...motionSafeProps}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className={`font-bold tracking-tight break-words ${dynamicSize}`}>
                  {typeof value === "number" ? value.toLocaleString() : value}
                </h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="p-3 bg-background rounded-full shrink-0">
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        </TooltipTrigger>
        {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
