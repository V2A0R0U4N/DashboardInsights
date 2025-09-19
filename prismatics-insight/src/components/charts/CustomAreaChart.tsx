import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from "recharts";

interface CustomAreaChartProps {
    data: any[];
    categories: string[];
    colors: string[];
    xAxisKey: string;
}

const CustomAreaChart = ({
    data,
    categories,
    colors,
    xAxisKey,
}: CustomAreaChartProps) => {
    return (
        <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        {categories.map((category, index) => (
                            <linearGradient
                                key={category}
                                id={`color-${category}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor={colors[index % colors.length]}
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={colors[index % colors.length]}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis
                        dataKey={xAxisKey}
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(25, 28, 36, 0.9)",
                            borderColor: "#374151",
                            borderRadius: "0.5rem",
                        }}
                        cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
                    />
                    <Legend iconType="circle" />
                    {categories.map((category, index) => (
                        <Area
                            key={category}
                            type="monotone"
                            dataKey={category}
                            stroke={colors[index % colors.length]}
                            fillOpacity={1}
                            fill={`url(#color-${category})`}
                            strokeWidth={2}
                            name={category.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} // Format name for legend
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CustomAreaChart;
