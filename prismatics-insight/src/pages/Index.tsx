import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Users,
  HelpCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  MessageSquare,
  Building,
  BarChart3,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import CustomLineChart from "@/components/charts/LineChart";
import LiveFeed from "@/components/LiveFeed";
import InsightCard from "@/components/InsightCard";
import DonutChart from "@/components/charts/DonutChart";
import CustomBarChart from "@/components/charts/BarChart";

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalQueries: number;
    successRate: number;
    avgResponseTime: number;
  };
  queryVolume: any[];
  peakHour: number | string;
  topRequestType: string;
  requestDistribution: any[];
  topRestaurants: any[];
}

const Index = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/overview-data");
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const jsonData = await res.json();

      // 👇 LOGGING FULL RESPONSE
      console.log("📊 Overview Data Response:", jsonData);

      setData(jsonData);
    } catch (error) {
      console.error("Failed to fetch overview data:", error);
      setError(
        "Failed to load overview data. Please ensure the backend server is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = io("http://localhost:5000");
    socket.on("dashboardUpdate", fetchData);
    return () => {
      socket.disconnect();
    };
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center text-xl">
          Loading Overview...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data || !data.kpis) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center text-xl text-red-500 p-8">
          {error || "No data available."}
        </div>
      </DashboardLayout>
    );
  }

  const {
    kpis,
    queryVolume,
    peakHour,
    topRequestType,
    requestDistribution,
    topRestaurants,
  } = data;

  const peakHourFormatted =
    typeof peakHour === "number"
      ? `${peakHour % 12 === 0 ? 12 : peakHour % 12} ${
          peakHour < 12 ? "AM" : "PM"
        }`
      : "N/A";

  const requestDistributionForChart = (requestDistribution || []).map(
    (item) => ({
      ...item,
      color:
        item.name === "api_actions"
          ? "#8B5CF6"
          : item.name === "product_guidance"
          ? "#06B6D4"
          : "#F59E0B",
    })
  );

  const formatString = (str: string) => {
    if (!str) return "N/A";
    return str
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 min-h-screen">
        <div>
          <h1 className="text-4xl font-bold">Overview</h1>
          <p className="text-muted-foreground text-lg">
            A summary of platform activity and key insights.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Users"
            value={kpis.totalUsers || 0}
            icon={Users}
            variant="purple"
          />
          <KPICard
            title="Total Queries"
            value={kpis.totalQueries || 0}
            icon={HelpCircle}
            variant="teal"
          />
          <KPICard
            title="Success Rate"
            value={`${(kpis.successRate || 0).toFixed(1)}%`}
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="Avg. Response Time"
            value={`${kpis.avgResponseTime || 0}ms`}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Query Volume */}
        <ChartCard title="Query Volume (Last 30 Days)" icon={TrendingUp}>
          <CustomLineChart
            data={queryVolume}
            dataKey="queries"
            xAxisKey="date"
            color="#8B5CF6"
          />
        </ChartCard>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            icon={Clock}
            title="Peak Hour"
            value={peakHourFormatted}
            subtitle="Highest user activity"
          />
          <InsightCard
            icon={MessageSquare}
            title="Top Request Type"
            value={formatString(topRequestType)}
            subtitle="Most common query category"
          />
          <InsightCard
            icon={Zap}
            title="Live"
            value="Active"
            subtitle="Real-time connection"
          />
        </div>

        {/* Distribution + Top Restaurants + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <ChartCard
            title="Request Type Distribution"
            icon={BarChart3}
            className="lg:col-span-1"
          >
            <DonutChart data={requestDistributionForChart} />
          </ChartCard>
          <ChartCard
            title="Top 5 Restaurants"
            icon={Building}
            className="lg:col-span-1"
          >
            <CustomBarChart
              data={topRestaurants}
              dataKey="queries"
              xAxisKey="name"
              color="#EF4444"
            />
          </ChartCard>
          <div className="lg:col-span-1">
            <LiveFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
