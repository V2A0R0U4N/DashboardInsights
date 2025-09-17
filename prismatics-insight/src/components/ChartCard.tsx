import { LucideIcon } from "lucide-react";
import { useState } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  data?: Array<any>;
  showDetails?: boolean;
  valueKey?: string;
  labelKey?: string;
}

export default function ChartCard({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  className = "",
  data = [],
  showDetails = true,
  valueKey = "value",
  labelKey = "name"
}: ChartCardProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Calculate analytics
  const totalValue = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  const maxItem = data.reduce((max, item) => (item[valueKey] || 0) > (max[valueKey] || 0) ? item : max, data[0] || {});
  const minItem = data.reduce((min, item) => (item[valueKey] || 0) < (min[valueKey] || 0) ? item : min, data[0] || {});

  return (
    <div className={`card-premium p-6 animate-scale-in ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {showDetails && data.length > 0 && (
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {showAnalytics ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>
      
      <div className="chart-container">
        {children}
      </div>

      {/* Detailed Analytics */}
      {showDetails && data.length > 0 && (
        <div className={`mt-6 transition-all duration-300 ${showAnalytics ? "block" : "hidden"}`}>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/30 rounded-2xl">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{maxItem[valueKey]?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Highest</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{minItem[valueKey]?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Lowest</p>
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground mb-3">Detailed Breakdown</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.map((item, index) => {
                const percentage = totalValue > 0 ? ((item[valueKey] || 0) / totalValue * 100) : 0;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/20 hover:bg-white/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color || '#8B5CF6' }}
                      />
                      <span className="text-sm font-medium">{item[labelKey] || item.name || `Item ${index + 1}`}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{(item[valueKey] || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <h4 className="text-sm font-semibold text-purple-700 mb-2">Key Insights</h4>
            <div className="space-y-1 text-xs text-purple-600">
              <p>• Top performer: <strong>{maxItem[labelKey] || maxItem.name}</strong> with {((maxItem[valueKey] || 0) / totalValue * 100).toFixed(1)}% share</p>
              <p>• Average value: <strong>{(totalValue / data.length).toLocaleString()}</strong> per item</p>
              <p>• Data points: <strong>{data.length}</strong> categories analyzed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}