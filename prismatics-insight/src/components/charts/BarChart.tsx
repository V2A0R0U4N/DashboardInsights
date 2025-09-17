import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BarChartProps {
  data: Array<any>;
  dataKey: string;
  xAxisKey: string;
  color?: string;
  gradient?: boolean;
}

export default function CustomBarChart({ 
  data, 
  dataKey, 
  xAxisKey, 
  color = "#8B5CF6",
  gradient = true 
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          {gradient && (
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="100%" stopColor={color} stopOpacity={0.3}/>
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="#666"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="#666"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
          }}
        />
        <Bar 
          dataKey={dataKey} 
          fill={gradient ? "url(#barGradient)" : color}
          radius={[8, 8, 0, 0]}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}