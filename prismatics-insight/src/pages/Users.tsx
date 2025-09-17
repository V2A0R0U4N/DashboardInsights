import { useEffect, useState } from "react";
import { User, UserCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import ChartCard from "@/components/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserData {
    userActivity: { email: string; queryCount: number; lastActivity: string }[];
    userTypes: { _id: string; count: number }[];
}

const UsersPage = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/users-data');
                const data = await res.json();
                setUserData(data);
            } catch (error) {
                console.error("Failed to fetch users data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading || !userData) {
        return (
            <DashboardLayout>
                <div className="p-8">Loading user analytics...</div>
            </DashboardLayout>
        );
    }

    const userTypesForChart = userData.userTypes.map(item => ({
        name: item._id,
        value: item.count,
        color: item._id === 'First-time' ? '#06B6D4' : '#8B5CF6'
    }));

    return (
        <DashboardLayout>
            <div className="p-8 space-y-8">
                <h1 className="text-4xl font-bold">User Analytics</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <ChartCard title="Most Active Users" icon={User}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Queries</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {userData.userActivity.map((user) => (
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
                    <div>
                        <ChartCard title="User Types" icon={UserCheck} data={userTypesForChart} valueKey="value" labelKey="name">
                            <DonutChart data={userTypesForChart} />
                        </ChartCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default UsersPage;