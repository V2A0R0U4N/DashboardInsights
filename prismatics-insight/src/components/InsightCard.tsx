import { LucideIcon } from 'lucide-react';

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
}

export default function InsightCard({ icon: Icon, title, value, subtitle }: InsightCardProps) {
  return (
    <div className="card-premium p-6 flex items-center gap-6">
      <div className="p-4 bg-purple-500/10 rounded-2xl">
        <Icon className="w-8 h-8 text-purple-600" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}