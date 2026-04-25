"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/api/attendance/stats").then((r) => r.data.data),
  });

  const { data: checkInsPerDay } = useQuery({
    queryKey: ["dashboard-checkins"],
    queryFn: () => api.get("/api/attendance/charts/checkins-per-day").then((r) => r.data.data),
  });

  const { data: peakHours } = useQuery({
    queryKey: ["dashboard-peak"],
    queryFn: () => api.get("/api/attendance/charts/peak-hours").then((r) => r.data.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">University Attendance System Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Students" value={stats?.totalUsers ?? "..."} icon={<Users className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Today Check-ins" value={stats?.todayCheckIns ?? "..."} icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
        <StatCard title="Failed Attempts" value={stats?.todayFailedAttempts ?? "..."} icon={<XCircle className="h-5 w-5 text-red-500" />} />
        <StatCard title="Avg Verification" value={stats?.averageVerificationScore ? `${(stats.averageVerificationScore * 100).toFixed(1)}%` : "..."} icon={<Activity className="h-5 w-5 text-purple-500" />} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Check-ins (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={checkInsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Peak Hours (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: any; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="p-3 bg-muted rounded-full">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
