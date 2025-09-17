import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LineChartProps {
  data: Array<any>;
  dataKey: string;
  xAxisKey: string;
  color?: string;
  strokeWidth?: number;
}

export default function CustomLineChart({ 
  data, 
  dataKey, 
  xAxisKey, 
  color = "#06B6D4",
  strokeWidth = 3 
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={color} stopOpacity={0.1}/>
          </linearGradient>
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
        <Line 
          type="monotone" 
          dataKey={dataKey} 
          stroke={color}
          strokeWidth={strokeWidth}
          dot={{ fill: color, strokeWidth: 2, r: 6 }}
          activeDot={{ r: 8, fill: color }}
          animationDuration={1500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}