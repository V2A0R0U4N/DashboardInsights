import { useEffect, useState } from "react";
import { Zap, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import CustomBarChart from "@/components/charts/BarChart";

interface AnalyticsData {
    phaseBreakdown: { name: string, time: number }[];
    tokenBreakdown: { name: string, value: number, color: string }[];
}

const Analytics = () => {
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/analytics-data');
                const data = await res.json();
                setAnalyticsData(data);
            } catch (error) {
                console.error("Failed to fetch analytics data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading || !analyticsData) {
        return (
            <DashboardLayout>
                <div className="p-8">Loading analytics...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 min-h-screen">
                {/* Header */}
                <div className="animate-fade-in">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Detailed Analytics
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        A deeper dive into performance and token metrics.
                    </p>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartCard
                        title="Prompt vs. Completion Tokens"
                        subtitle="Total token usage breakdown"
                        icon={Zap}
                        data={analyticsData.tokenBreakdown}
                        valueKey="value"
                        labelKey="name"
                    >
                        <DonutChart data={analyticsData.tokenBreakdown} />
                    </ChartCard>

                    <ChartCard
                        title="Average Time per Processing Phase (ms)"
                        subtitle="Latency analysis for each step"
                        icon={Clock}
                        data={analyticsData.phaseBreakdown}
                        valueKey="time"
                        labelKey="name"
                    >
                        <CustomBarChart
                            data={analyticsData.phaseBreakdown}
                            dataKey="time"
                            xAxisKey="name"
                            color="#06B6D4"
                        />
                    </ChartCard>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Analytics;