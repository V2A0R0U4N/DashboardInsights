import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useFilters } from "@/contexts/FilterContext";
import { Users, Activity, TrendingUp, Globe, Clock, Zap, CheckCircle, BarChart3, UserCheck, Repeat } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import FilterBar from "@/components/FilterBar";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import CustomBarChart from "@/components/charts/BarChart";
import CustomLineChart from "@/components/charts/LineChart";
import LiveFeed from "@/components/LiveFeed";

interface DashboardData {
  kpis: {
    totalUsers?: number;
    totalSessions?: number;
    restaurants?: number;
    avgQueriesPerSession?: number;
    successRatio?: number;
    totalTokens?: number;
    avgResponseTime?: number;
  };
  requestDistribution: any[];
  statusData: any[];
  routeDistribution: any[];
  responseTimes: any[];
  geographicData: any[];
  topRestaurants: any[];
  userTypes: any[];
  duplicateQueries: any[];
}

const Index = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useFilters();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const queryParams = new URLSearchParams(filters as unknown as Record<string, string>).toString();
    
    try {
      const res = await fetch(`http://localhost:5000/api/dashboard-data?${queryParams}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const jsonData = await res.json();
      setDashboardData(jsonData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setError("Failed to load dashboard data. Please ensure the backend server is running.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
    const socket = io("http://localhost:5000");
    socket.on('dashboardUpdate', fetchData);
    return () => { socket.disconnect(); };
  }, [fetchData]);

  if (isLoading) {
    return <DashboardLayout><div className="flex h-full items-center justify-center text-xl">Loading Dashboard...</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="flex h-full items-center justify-center text-xl text-red-500 p-8">{error}</div></DashboardLayout>;
  }
  
  const { 
    kpis = {}, 
    requestDistribution = [], 
    statusData = [], 
    routeDistribution = [], 
    responseTimes = [], 
    geographicData = [], 
    topRestaurants = [], 
    userTypes = [], 
    duplicateQueries = [] 
  } = dashboardData || {};

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 min-h-screen">
        <FilterBar />
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-lg">Real-time insights and performance metrics</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Total Users" value={kpis.totalUsers || 0} icon={Users} variant="purple" subtitle="Unique user emails" />
          <KPICard title="Total Sessions" value={kpis.totalSessions || 0} icon={Activity} variant="teal" subtitle="Active user sessions" />
          <KPICard title="Restaurants" value={kpis.restaurants || 0} icon={Globe} variant="pink" subtitle="Connected establishments" />
          <KPICard title="Success Rate" value={`${(kpis.successRatio || 0).toFixed(1)}%`} icon={CheckCircle} variant="success" subtitle="Query success ratio" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard title="Avg Queries/Session" value={(kpis.avgQueriesPerSession || 0).toFixed(2)} icon={BarChart3} variant="warning" subtitle="Per session average" />
          <KPICard title="Total Tokens" value={(kpis.totalTokens || 0).toLocaleString()} icon={Zap} variant="purple" subtitle="Token usage" />
          <KPICard title="Avg Response Time" value={`${kpis.avgResponseTime || 0}ms`} icon={Clock} variant="teal" subtitle="Average response time" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCard title="Request Distribution" subtitle="Breakdown by request type" icon={BarChart3} data={requestDistribution} valueKey="value" labelKey="name">
            <DonutChart data={requestDistribution} />
          </ChartCard>
          <ChartCard title="Success vs Failure Rate" subtitle="Query success ratio" icon={CheckCircle} data={statusData} valueKey="value" labelKey="name">
            <DonutChart data={statusData} />
          </ChartCard>
          <ChartCard title="First-time vs Returning Users" subtitle="Based on user type" icon={UserCheck} data={userTypes} valueKey="count" labelKey="_id">
            <DonutChart data={userTypes} />
          </ChartCard>
          <ChartCard title="Top 5 Duplicate Queries" subtitle="Most frequently asked questions" icon={Repeat} data={duplicateQueries} valueKey="count" labelKey="_id">
            <CustomBarChart data={duplicateQueries} dataKey="count" xAxisKey="_id" color="#F59E0B" />
          </ChartCard>
          <ChartCard title="Route Distribution" subtitle="Most popular query routes" icon={TrendingUp} data={routeDistribution} valueKey="count" labelKey="route">
            <CustomBarChart data={routeDistribution} dataKey="count" xAxisKey="route" color="#8B5CF6" />
          </ChartCard>
          <ChartCard title="Response Time Trends" subtitle="Average response times by hour" icon={Clock} data={responseTimes} valueKey="avg" labelKey="time">
            <CustomLineChart data={responseTimes} dataKey="avg" xAxisKey="time" color="#06B6D4" />
          </ChartCard>
          <ChartCard title="Top Countries" subtitle="Requests by geographic location" icon={Globe} data={geographicData} valueKey="requests" labelKey="country">
            <CustomBarChart data={geographicData} dataKey="requests" xAxisKey="country" color="#F59E0B" />
          </ChartCard>
          <div className="lg:col-span-1">
            <LiveFeed />
          </div>
        </div>

        <ChartCard title="Top Performing Restaurants" subtitle="Restaurants by query volume" icon={TrendingUp} className="animate-scale-in">
          <div className="space-y-4">
            {topRestaurants.map((restaurant: any, index: number) => (
              <div key={restaurant.id} className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/50 to-purple-50/30 border" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">{index + 1}</div>
                  <div>
                    <h4 className="font-semibold">{restaurant.name}</h4>
                    <p className="text-sm text-muted-foreground">{restaurant.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{restaurant.queries.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">queries</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </DashboardLayout>
  );
};
export default Index;