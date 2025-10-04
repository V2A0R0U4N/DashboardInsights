import { useEffect, useState } from "react";
import { Zap, Clock, AlertTriangle, Percent, Activity } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import CustomBarChart from "@/components/charts/BarChart";
import KPICard from "@/components/KPICard";
import { Tooltip as ShadTooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Tooltip as ReTooltip,
    Legend,
    ResponsiveContainer,
    Treemap
} from "recharts";

interface ResourceUtilizationItem {
    name: string;
    totalTokens: number;
    avgTokensPerQuery?: number | null;
}

interface RequestTypeMetric {
    name: string;
    avgResponseTime: number;
    successRate: number;
}

interface AnalyticsData {
    phaseBreakdown: { name: string; time: number }[];
    tokenBreakdown: { name: string; value: number; color: string }[];
    latencyPercentiles?: { p50: number; p95: number; p99: number };
    errorTrends: { name: string; count: number }[];
    resourceUtilization: ResourceUtilizationItem[];
    requestTypeMetrics: RequestTypeMetric[];
}

const numberFormat = (n: number) => new Intl.NumberFormat().format(n);

const AnalyticsPage = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/analytics-data");
                if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
                const jsonData = await res.json();
                setData(jsonData);
            } catch (err) {
                console.error("Failed to fetch analytics data:", err);
                setError("Failed to load analytics data. Please ensure the backend server is running.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center text-xl">Loading Detailed Analytics...</div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex h-full items-center justify-center text-xl text-red-500 p-8">{error}</div>
            </DashboardLayout>
        );
    }

    const {
        phaseBreakdown = [],
        tokenBreakdown = [],
        latencyPercentiles = { p50: 0, p95: 0, p99: 0 },
        errorTrends = [],
        resourceUtilization = [],
        requestTypeMetrics = []
    } = data || {};

    // top error for KPI
    const topError = errorTrends.length > 0 ? errorTrends[0] : { name: "No errors", count: 0 };

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 min-h-screen">
                <div>
                    <h1 className="text-4xl font-bold">Detailed Analytics</h1>
                    <p className="text-muted-foreground text-lg">A deep-dive into performance and error metrics.</p>
                </div>

                {/* KPI Cards */}
                <TooltipProvider>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <ShadTooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <KPICard
                                        title="P50 Latency"
                                        value={`${(latencyPercentiles.p50 || 0).toFixed(0)}ms`}
                                        icon={Percent}
                                        variant="teal"
                                        subtitle="Median response time"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Exact: {(latencyPercentiles.p50 || 0).toFixed(6)} ms</p>
                            </TooltipContent>
                        </ShadTooltip>

                        <ShadTooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <KPICard
                                        title="P95 Latency"
                                        value={`${(latencyPercentiles.p95 || 0).toFixed(0)}ms`}
                                        icon={Percent}
                                        variant="warning"
                                        subtitle="95% of requests are faster"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Exact: {(latencyPercentiles.p95 || 0).toFixed(6)} ms</p>
                            </TooltipContent>
                        </ShadTooltip>

                        <ShadTooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <KPICard
                                        title="P99 Latency"
                                        value={`${(latencyPercentiles.p99 || 0).toFixed(0)}ms`}
                                        icon={Percent}
                                        variant="destructive"
                                        subtitle="99% of requests are faster"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Exact: {(latencyPercentiles.p99 || 0).toFixed(6)} ms</p>
                            </TooltipContent>
                        </ShadTooltip>

                        <ShadTooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <KPICard
                                        title="Max Error Trend"
                                        value={`${topError.count}`}
                                        icon={AlertTriangle}
                                        variant="destructive"
                                        subtitle="Most frequent error"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{topError.name || "No errors"}</p>
                            </TooltipContent>
                        </ShadTooltip>
                    </div>
                </TooltipProvider>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Prompt vs Completion tokens */}
                    <ChartCard title="Prompt vs. Completion Tokens" subtitle="Total token usage breakdown" icon={Zap} data={tokenBreakdown} valueKey="value" labelKey="name">
                        <DonutChart data={tokenBreakdown} />
                    </ChartCard>

                    {/* Phase breakdown */}
                    <ChartCard title="Average Time per Processing Phase (ms)" subtitle="Latency analysis for each step" icon={Clock} data={phaseBreakdown} valueKey="time" labelKey="name">
                        <CustomBarChart data={phaseBreakdown} dataKey="time" xAxisKey="name" color="#06B6D4" />
                    </ChartCard>

                    {/* Request Type Performance (Radar with gradients) */}
                    <ChartCard title="Request Type Performance" subtitle="Avg response time & success rate" icon={Activity} data={requestTypeMetrics} valueKey="avgResponseTime" labelKey="name" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={420}>
                            <RadarChart data={requestTypeMetrics}>
                                <defs>
                                    <linearGradient id="gResp" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.5} />
                                    </linearGradient>
                                    <linearGradient id="gSucc" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#064E3B" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <PolarGrid strokeDasharray="4 6" />
                                <PolarAngleAxis dataKey="name" />
                                <PolarRadiusAxis />
                                <Radar name="Avg Response Time" dataKey="avgResponseTime" stroke="#3B82F6" fill="url(#gResp)" fillOpacity={0.6} />
                                <Radar name="Success Rate (%)" dataKey="successRate" stroke="#10B981" fill="url(#gSucc)" fillOpacity={0.35} />
                                <ReTooltip />
                                <Legend />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Resource Utilization (Treemap) */}
                    <ChartCard title="Resource Utilization" subtitle="Token consumption breakdown by component" icon={Zap} data={resourceUtilization as any} valueKey="totalTokens" labelKey="name" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={420}>
                            <Treemap data={resourceUtilization} dataKey="totalTokens" nameKey="name" stroke="#fff" />
                        </ResponsiveContainer>

                        {/* helpful details table beneath treemap for avg tokens / query */}
                        <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Components (top → bottom)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                {resourceUtilization.map((r) => (
                                    <div key={r.name} className="flex justify-between items-center border p-2 rounded-md bg-white/60">
                                        <div className="truncate pr-2">
                                            <div className="font-medium">{r.name}</div>
                                            <div className="text-xs text-muted-foreground">{r.avgTokensPerQuery != null ? `avg ${r.avgTokensPerQuery} tokens/query` : 'avg N/A'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">{numberFormat(r.totalTokens)}</div>
                                            <div className="text-xs text-muted-foreground">tokens</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ChartCard>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;
