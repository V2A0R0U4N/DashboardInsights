import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Users,
  HelpCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  UserPlus,
  Building,
  BarChart3,
  Zap,
  ArrowDownRight,
  Minus,
  TrendingDown
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import CustomLineChart from "@/components/charts/LineChart";
import LiveFeed from "@/components/LiveFeed";
import InsightCard from "@/components/InsightCard";
import CustomAreaChart from "@/components/charts/CustomAreaChart";
import CustomBarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";

interface WeeklyGrowth {
  queries: number;
  users: number;
  responseTime: number;
  successRate: number;
  tokens: number;
  currentWeek: {
    queries: number;
    users: number;
    avgResponseTime: number;
    successRate: number;
    tokens: number;
  };
  previousWeek: {
    queries: number;
    users: number;
    avgResponseTime: number;
    successRate: number;
    tokens: number;
  };
}

interface OverviewData {
  kpis: {
    totalUsers: number;
    totalQueries: number;
    successRate: number;
    avgResponseTime: number;
    totalRestaurants: number;
    totalTokens: number;
  };
  queryVolume: Array<{
    date: string;
    queries: number;
    avgResponseTime: number;
    successRate: number;
  }>;
  topRestaurants: Array<{
    name: string;
    restaurantId: string;
    queries: number;
    successRate: number;
    avgResponseTime: number;
    uniqueUsers: number;
  }>;
  requestDistribution: Array<{
    name: string;
    value: number;
    avgResponseTime: number;
  }>;
  userGrowth: Array<{
    date: string;
    newUsers: number;
    returningUsers: number;
  }>;
  weeklyGrowth: WeeklyGrowth;
  activeUsers: number;
  peakHour: string | number;
  latestError: string;
  errorTimestamp: string | null;
  timestamp: string;
}

// Helper component for growth indicators
const GrowthIndicator = ({ value, showIcon = true }: { value: number; showIcon?: boolean }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;
  
  const getColor = () => {
    if (isNeutral) return "text-gray-500";
    return isPositive ? "text-green-600" : "text-red-600";
  };

  const getIcon = () => {
    if (isNeutral) return Minus;
    return isPositive ? TrendingUp : TrendingDown;
  };

  const Icon = getIcon();

  return (
    <div className={`flex items-center gap-1 ${getColor()}`}>
      {showIcon && <Icon className="w-4 h-4" />}
      <span className="text-sm font-semibold">
        {isPositive ? '+' : ''}{value}%
      </span>
    </div>
  );
};

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
      console.log("📊 Overview data loaded:", jsonData);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mr-4"></div>
          Loading Overview...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data || !data.kpis) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center text-xl text-red-500 p-8">
          <AlertTriangle className="w-8 h-8 mr-4" />
          {error || "No data available."}
        </div>
      </DashboardLayout>
    );
  }

  const {
    kpis,
    queryVolume,
    topRestaurants,
    requestDistribution,
    userGrowth,
    weeklyGrowth,
    activeUsers,
    peakHour,
    latestError,
    errorTimestamp
  } = data;

  // Format peak hour for display
  const formatPeakHour = (hour: string | number) => {
    if (hour === 'N/A') return 'N/A';
    const hourNum = typeof hour === 'string' ? parseInt(hour) : hour;
    if (isNaN(hourNum)) return 'N/A';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    const ampm = hourNum < 12 ? 'AM' : 'PM';
    return `${displayHour} ${ampm}`;
  };

  // Prepare chart data with colors
  const requestDistributionChart = requestDistribution.map((item, index) => ({
    ...item,
    color: ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981'][index % 5]
  }));

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 min-h-screen">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            Overview Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time analytics with comprehensive growth tracking and performance insights.
          </p>
        </div>

        {/* Enhanced KPI Cards with Growth Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-fade-in">
          <div className="relative">
            <KPICard
              title="Total Users"
              value={kpis.totalUsers || 0}
              icon={Users}
              variant="purple"
              subtitle={`${weeklyGrowth.currentWeek.users} active this week`}
            />
            <div className="absolute top-4 right-4">
              <GrowthIndicator value={weeklyGrowth.users} />
            </div>
          </div>

          <div className="relative">
            <KPICard
              title="Total Queries"
              value={kpis.totalQueries || 0}
              icon={HelpCircle}
              variant="teal"
              subtitle={`${weeklyGrowth.currentWeek.queries} this week`}
            />
            <div className="absolute top-4 right-4">
              <GrowthIndicator value={weeklyGrowth.queries} />
            </div>
          </div>

          <div className="relative">
            <KPICard
              title="Success Rate"
              value={`${(kpis.successRate || 0).toFixed(1)}%`}
              icon={CheckCircle}
              variant="success"
              subtitle={`${weeklyGrowth.currentWeek.successRate.toFixed(1)}% this week`}
            />
            <div className="absolute top-4 right-4">
              <GrowthIndicator value={weeklyGrowth.successRate} />
            </div>
          </div>

          <div className="relative">
            <KPICard
              title="Avg. Response Time"
              value={`${kpis.avgResponseTime || 0}ms`}
              icon={Clock}
              variant="warning"
              subtitle={`${weeklyGrowth.currentWeek.avgResponseTime}ms this week`}
            />
            <div className="absolute top-4 right-4">
              <GrowthIndicator value={weeklyGrowth.responseTime} />
            </div>
          </div>

          <div className="relative">
            <KPICard
              title="Token Usage"
              value={`${(kpis.totalTokens || 0).toLocaleString()}`}
              icon={Zap}
              variant="pink"
              subtitle={`${(weeklyGrowth.currentWeek.tokens || 0).toLocaleString()} this week`}
            />
            <div className="absolute top-4 right-4">
              <GrowthIndicator value={weeklyGrowth.tokens || 0} />
            </div>
          </div>
        </div>

        {/* Enhanced Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-up">
          <InsightCard
            icon={Activity}
            title="Active Users (5m)"
            value={activeUsers.toString()}
            subtitle="Real-time engagement"
          />
          <InsightCard
            icon={ArrowUpRight}
            title="Weekly Growth"
            value={`${weeklyGrowth.queries > 0 ? '+' : ''}${weeklyGrowth.queries}%`}
            subtitle="Query volume vs. last week"
          />
          <InsightCard
            icon={Clock}
            title="Peak Hour"
            value={formatPeakHour(peakHour)}
            subtitle="Highest activity time"
          />
          <InsightCard
            icon={Building}
            title="Active Restaurants"
            value={kpis.totalRestaurants?.toString() || '0'}
            subtitle="Total establishments"
          />
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Query Volume Trend */}
          <div className="lg:col-span-2">
            <ChartCard 
              title="Query Volume & Performance Trends" 
              subtitle="Daily queries with response time and success rate"
              icon={TrendingUp}
              data={queryVolume}
              valueKey="queries"
              labelKey="date"
            >
              <CustomLineChart
                data={queryVolume}
                dataKey="queries"
                xAxisKey="date"
                color="#8B5CF6"
              />
            </ChartCard>
          </div>

          {/* Live Feed */}
          <div className="lg:col-span-1">
            <LiveFeed />
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Type Distribution */}
          <ChartCard 
            title="Request Type Distribution" 
            subtitle="Query categories and their performance"
            icon={BarChart3}
            data={requestDistributionChart}
            valueKey="value"
            labelKey="name"
          >
            <DonutChart 
              data={requestDistributionChart} 
            />
          </ChartCard>

          {/* Top Restaurants */}
          <ChartCard 
            title="Top Performing Restaurants" 
            subtitle="Most active establishments"
            icon={Building}
            data={topRestaurants.slice(0, 8)}
            valueKey="queries"
            labelKey="name"
          >
            <CustomBarChart
              data={topRestaurants.slice(0, 8)}
              dataKey="queries"
              xAxisKey="name"
              color="#10B981"
            />
          </ChartCard>

          {/* System Health & Alerts */}
          <div className="space-y-6">
            {/* System Health Card */}
            <div className="card-premium p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Tokens Used</span>
                  <span className="text-sm font-semibold">{kpis.totalTokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Success Rate</span>
                  <span className="text-sm font-semibold text-green-600">{kpis.successRate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Restaurants</span>
                  <span className="text-sm font-semibold">{kpis.totalRestaurants || 0}</span>
                </div>
              </div>
            </div>

            {/* Latest Error Alert */}
            <div className="card-premium p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                System Alerts
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800">Latest Error</div>
                  <div className="text-xs text-red-600 mt-1 break-words">
                    {latestError === "No recent errors" ? (
                      <span className="text-green-600">✅ No recent errors detected</span>
                    ) : (
                      <>
                        {latestError.length > 100 ? `${latestError.substring(0, 100)}...` : latestError}
                        {errorTimestamp && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(errorTimestamp).toLocaleString()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Growth Summary */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Weekly Growth Summary</div>
                  <div className="text-xs text-blue-600 mt-1 space-y-1">
                    <div>Queries: <GrowthIndicator value={weeklyGrowth.queries} showIcon={false} /></div>
                    <div>Users: <GrowthIndicator value={weeklyGrowth.users} showIcon={false} /></div>
                    <div>Response Time: <GrowthIndicator value={weeklyGrowth.responseTime} showIcon={false} /></div>
                    <div>Tokens: <GrowthIndicator value={weeklyGrowth.tokens || 0} showIcon={false} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Growth Analysis */}
        <div className="grid grid-cols-1 gap-8">
          <ChartCard 
            title="User Growth Analysis" 
            subtitle="New vs. returning user activity over time"
            icon={UserPlus}
            data={userGrowth}
            valueKey="newUsers"
            labelKey="date"
          >
            <CustomAreaChart
              data={userGrowth}
              categories={["newUsers", "returningUsers"]}
              colors={["#34D399", "#A78BFA"]}
              xAxisKey="date"
            />
          </ChartCard>
        </div>

        {/* Data Summary Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground bg-white/50 rounded-lg p-4 animate-fade-in">
          <div>
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
          <div className="flex items-center gap-4">
            <span>Data range: Last 30 days</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live data</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;