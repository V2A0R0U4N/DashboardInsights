import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, UserCheck } from "lucide-react";

interface UserData {
    userActivity: { email: string; queryCount: number; lastActivity: string }[];
    userTypes: { _id: string; count: number }[];
}

const UsersPage = () => {
    const [data, setData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/users-data');
                if (!res.ok) {
                    throw new Error(`Failed to fetch: ${res.status}`);
                }
                const jsonData = await res.json();
                setData(jsonData);
            } catch (error) {
                console.error("Failed to fetch users data:", error);
                setError("Failed to load users data. Please ensure the backend server is running.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <DashboardLayout><div className="flex h-full items-center justify-center text-xl">Loading User Analytics...</div></DashboardLayout>;
    }

    if (error || !data) {
        return <DashboardLayout><div className="flex h-full items-center justify-center text-xl text-red-500 p-8">{error || "No data available."}</div></DashboardLayout>;
    }

    const { userActivity = [], userTypes = [] } = data;

    const userTypesForChart = userTypes.map(item => ({
        name: item._id,
        value: item.count,
        color: item._id === 'First-time' ? '#06B6D4' : '#8B5CF6'
    }));

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8 min-h-screen">
                <div>
                    <h1 className="text-4xl font-bold">User Analytics</h1>
                    <p className="text-muted-foreground text-lg">A breakdown of user activity and types.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <ChartCard title="Most Active Users" icon={User}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Total Queries</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userActivity.map((user) => (
                                        <TableRow key={user.email}>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.queryCount}</TableCell>
                                            <TableCell>{new Date(user.lastActivity).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ChartCard>
                    </div>
                    <ChartCard title="User Types" icon={UserCheck} data={userTypesForChart} valueKey="value" labelKey="name">
                        <DonutChart data={userTypesForChart} />
                    </ChartCard>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default UsersPage;