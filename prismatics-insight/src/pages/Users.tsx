// UsersPage.tsx
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    User,
    UserCheck,
    Activity,
    Clock,
    Copy,
    Shuffle,
    TrendingUp,
    ArrowRight,
} from "lucide-react";

interface UserActivityItem {
    email: string;
    queryCount: number;
    lastActivity: string;
}
interface UserTypeItem {
    _id: string;
    count: number;
}
interface DuplicateQuery {
    query: string;
    count: number;
    users: string[];
}
interface JourneyItem {
    from: string;
    to: string;
    count: number;
}
interface EngagementItem {
    email: string;
    queryCount: number;
    successRate: number;
    score: number;
}

interface ApiPayload {
    userTypes: UserTypeItem[];
    userActivity: UserActivityItem[];
    queriesPerSession: number[];
    durations: number[];
    avgQueriesPerSession: number;
    duplicateQueries: DuplicateQuery[];
    retentionWeekly: any[];
    queryComplexityByUserType: any[];
    userJourneyTransitions: JourneyItem[];
    engagement: EngagementItem[];
}

const PAGE_SIZE = 10;

export default function UsersPage() {
    const [data, setData] = useState<ApiPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("http://localhost:5000/api/users-data");
                if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
                const json: ApiPayload = await res.json();
                setData(json);
            } catch (err) {
                console.error("users fetch error", err);
                setError("Failed to load user analytics. Check backend.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading)
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full text-xl">
                    Loading User Analytics...
                </div>
            </DashboardLayout>
        );

    if (error || !data)
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full text-xl text-red-500">
                    {error || "No data"}
                </div>
            </DashboardLayout>
        );

    const {
        userTypes,
        userActivity,
        queriesPerSession,
        durations,
        duplicateQueries,
        retentionWeekly,
        queryComplexityByUserType,
        userJourneyTransitions,
        engagement,
    } = data;

    // pagination
    const totalPages = Math.max(
        1,
        Math.ceil((userActivity?.length || 0) / PAGE_SIZE)
    );
    const paginatedUsers = userActivity.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    // User type donut chart
    const userTypesForChart = (userTypes || []).map((u) => ({
        name: u._id,
        value: u.count,
        color: u._id === "First-time" ? "#06B6D4" : "#8B5CF6",
    }));

    // Bucketed Queries per Session
    const queriesBuckets = [
        { range: "1-5", count: queriesPerSession.filter((q) => q <= 5).length },
        {
            range: "6-10",
            count: queriesPerSession.filter((q) => q > 5 && q <= 10).length,
        },
        {
            range: "11-20",
            count: queriesPerSession.filter((q) => q > 10 && q <= 20).length,
        },
        {
            range: "21-50",
            count: queriesPerSession.filter((q) => q > 20 && q <= 50).length,
        },
        { range: "50+", count: queriesPerSession.filter((q) => q > 50).length },
    ];

    // Bucketed Session Durations
    const durationBuckets = [
        { range: "0-30s", count: durations.filter((d) => d <= 30).length },
        {
            range: "30-60s",
            count: durations.filter((d) => d > 30 && d <= 60).length,
        },
        {
            range: "1-5m",
            count: durations.filter((d) => d > 60 && d <= 300).length,
        },
        {
            range: "5-15m",
            count: durations.filter((d) => d > 300 && d <= 900).length,
        },
        { range: "15m+", count: durations.filter((d) => d > 900).length },
    ];

    return (
        <DashboardLayout>
            <div className="p-8 space-y-10 min-h-screen bg-gray-50">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold">User Analytics</h1>
                    <p className="text-muted-foreground text-lg mt-1">
                        User breakdown, session patterns and retention.
                    </p>
                </div>

                {/* Top Users + User Types */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top Users */}
                    <ChartCard title="Most Active Users" icon={User}>
                        <div className="space-y-3">
                            {paginatedUsers.map((u, idx) => (
                                <div
                                    key={u.email}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white shadow-sm border hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-lg text-indigo-600">
                                            {(page - 1) * PAGE_SIZE + idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-800">{u.email}</p>
                                            <p className="text-xs text-gray-500">
                                                Last active:{" "}
                                                {u.lastActivity
                                                    ? new Date(u.lastActivity).toLocaleString()
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-indigo-700">
                                            {u.queryCount} queries
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* pagination */}
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </ChartCard>

                    {/* User types donut */}
                    <ChartCard title="User Types" icon={UserCheck}>
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div style={{ height: 220, width: 220 }}>
                                <DonutChart data={userTypesForChart} />
                            </div>
                            <div className="flex flex-col gap-2 text-sm">
                                {userTypesForChart.map((t) => (
                                    <div
                                        key={t.name}
                                        className="flex items-center justify-between w-40"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: t.color }}
                                            />
                                            {t.name}
                                        </div>
                                        <span className="font-semibold">{t.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ChartCard>
                </div>

                {/* Session Buckets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartCard title="Queries per Session (Buckets)" icon={Activity}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={queriesBuckets}>
                                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(val) => (val as number).toLocaleString()} />
                                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Session Duration Buckets" icon={Clock}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={durationBuckets}>
                                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* Duplicate queries + User Journey Transitions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <ChartCard
                        title="Duplicate Queries (Top 10)"
                        icon={Copy}
                        className="lg:col-span-2"
                    >
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-3/4">Query</TableHead>
                                        <TableHead className="w-1/4">Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {duplicateQueries.slice(0, 10).map((q, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="truncate">{q.query}</TableCell>
                                            <TableCell>{q.count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ChartCard>

                    <ChartCard title="Top User Journey Flow" icon={Shuffle}>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {userJourneyTransitions.slice(0, 15).map((t, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold text-blue-700 mb-1">
                                                    FROM
                                                </div>
                                                <div className="text-sm text-gray-700 truncate">
                                                    {t.from}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                            <div className="flex-1">
                                                <div className="text-xs font-semibold text-purple-700 mb-1">
                                                    TO
                                                </div>
                                                <div className="text-sm text-gray-700 truncate">
                                                    {t.to}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                                        {t.count}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>

                {/* Retention + Engagement (Full Width) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartCard
                        title="Weekly Retention (Users per Week)"
                        icon={TrendingUp}
                    >
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart
                                data={retentionWeekly.map((r) => ({
                                    week: r.week,
                                    users: r.users,
                                }))}
                            >
                                <XAxis 
                                    dataKey="week" 
                                    tick={{ fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line 
                                    dataKey="users" 
                                    stroke="#3B82F6" 
                                    strokeWidth={3}
                                    dot={{ fill: '#3B82F6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Engagement Leaderboard (Top 15)" icon={User}>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {engagement.slice(0, 15).map((e, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-200 shadow-sm hover:shadow-md transition"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 truncate">
                                                {e.email}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                                    Queries: {e.queryCount}
                                                </span>
                                                <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded">
                                                    Success: {e.successRate}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-2xl font-bold text-purple-700">
                                            {e.score}
                                        </div>
                                        <div className="text-xs text-purple-600 font-medium">
                                            SCORE
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ChartCard>
                </div>

                {/* Query Complexity */}
                <ChartCard title="Query Complexity by User Type" icon={Activity}>
                    <div className="space-y-2">
                        {queryComplexityByUserType.map((c, i) => (
                            <div
                                key={i}
                                className="flex justify-between p-2 bg-white rounded border shadow-sm"
                            >
                                <div>{c.userType}</div>
                                <div className="text-right">
                                    <div className="font-semibold">
                                        {Math.round(c.avgTokens)} tokens
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        avg length: {Math.round(c.avgLength)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </DashboardLayout>
    );
}