import { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant: "pink" | "teal" | "purple" | "success" | "warning" | "error";
  subtitle?: string;
  delay?: number;
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const stepValue = value / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.min(stepValue * currentStep, value));
        
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return <span>{Math.round(displayValue).toLocaleString()}</span>;
}

export default function KPICard({ title, value, change, icon: Icon, variant, subtitle, delay = 0 }: KPICardProps) {
  const numValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div 
      className={`kpi-card-${variant} rounded-3xl p-8 text-slate-800 transition-all duration-500 hover:scale-105 animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="p-3 bg-slate-800/10 rounded-2xl backdrop-blur-sm">
          <Icon className="w-6 h-6 text-slate-700" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
            isPositive ? "bg-green-600/20 text-green-800" :
            isNegative ? "bg-red-600/20 text-red-800" :
            "bg-slate-600/20 text-slate-800"
          }`}>
            <span className="text-xs">
              {isPositive ? "↗" : isNegative ? "↘" : "→"}
            </span>
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider">
          {title}
        </h3>
        <div className="text-4xl font-bold">
          {typeof value === "number" ? <AnimatedNumber value={numValue} delay={delay} /> : value}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-600 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}