import { useEffect, useState } from "react";
import { Zap, Clock, AlertTriangle, Percent } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import CustomBarChart from "@/components/charts/BarChart";
import KPICard from "@/components/KPICard";

interface AnalyticsData {
    phaseBreakdown: { name: string, time: number }[];
    tokenBreakdown: { name: string, value: number, color: string }[];
    latencyPercentiles?: { p50: number, p90: number, p95: number };
    errorTrends: { name: string, count: number }[];
}

const AnalyticsPage = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/analytics-data');
                if (!res.ok) {
                    throw new Error(`Failed to fetch: ${res.status}`);
                }
                const jsonData = await res.json();
                setData(jsonData);
            } catch (error) {
                console.error("Failed to fetch analytics data:", error);
                setError("Failed to load analytics data. Please ensure the backend server is running.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <DashboardLayout><div className="flex h-full items-center justify-center text-xl">Loading Detailed Analytics...</div></DashboardLayout>;
    }

    if (error) {
        return <DashboardLayout><div className="flex h-full items-center justify-center text-xl text-red-500 p-8">{error}</div></DashboardLayout>;
    }

    const {
        phaseBreakdown = [],
        tokenBreakdown = [],
        latencyPercentiles = { p50: 0, p90: 0, p95: 0 },
        errorTrends = []
    } = data || {};

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 min-h-screen">
                <div>
                    <h1 className="text-4xl font-bold">Detailed Analytics</h1>
                    <p className="text-muted-foreground text-lg">A deep-dive into performance and error metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="P50 Latency" value={`${(latencyPercentiles.p50 || 0).toFixed(0)}ms`} icon={Percent} variant="teal" subtitle="Median response time" />
                    <KPICard title="P90 Latency" value={`${(latencyPercentiles.p90 || 0).toFixed(0)}ms`} icon={Percent} variant="warning" subtitle="90% of requests are faster" />
                    <KPICard title="P95 Latency" value={`${(latencyPercentiles.p95 || 0).toFixed(0)}ms`} icon={Percent} variant="destructive" subtitle="95% of requests are faster" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartCard title="Prompt vs. Completion Tokens" subtitle="Total token usage breakdown" icon={Zap} data={tokenBreakdown} valueKey="value" labelKey="name">
                        <DonutChart data={tokenBreakdown} />
                    </ChartCard>

                    <ChartCard title="Average Time per Processing Phase (ms)" subtitle="Latency analysis for each step" icon={Clock} data={phaseBreakdown} valueKey="time" labelKey="name">
                        <CustomBarChart data={phaseBreakdown} dataKey="time" xAxisKey="name" color="#06B6D4" />
                    </ChartCard>

                    <ChartCard title="Top 5 Error Messages" subtitle="Most common failure reasons" icon={AlertTriangle} data={errorTrends} className="lg:col-span-2">
                        <CustomBarChart data={errorTrends} dataKey="count" xAxisKey="name" color="#EF4444" />
                    </ChartCard>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;