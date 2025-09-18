import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion"; // --- IMPORT ADDED HERE ---

import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

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
  change?: number;
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
  change,
  isLoading,
  delay = 0,
  ...props
}: KPICardProps) {
  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  // Only pass props that are valid for motion.div
  const {
    onDrag, // Remove problematic props
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    ...motionSafeProps
  } = props;

  return (
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
          <h3 className="text-3xl font-bold">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="p-3 bg-background rounded-full">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4">
          <Badge variant={change >= 0 ? "success" : "destructive"}>
            {change >= 0 ? `+${change}` : change}%
          </Badge>
        </div>
      )}
    </motion.div>
  );
}