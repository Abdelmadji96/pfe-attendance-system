"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, XCircle, Activity, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#ea580c", "#8b5cf6", "#06b6d4", "#d946ef"];

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: classGroups } = useQuery({ queryKey: ["allClassGroups"], queryFn: () => api.get("/api/master-data/class-groups").then((r) => r.data.data) });
  const { data: modules } = useQuery({ queryKey: ["allModules"], queryFn: () => api.get("/api/modules").then((r) => r.data.data) });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance", page, search, status, classGroupId, moduleId, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (classGroupId) params.set("classGroupId", classGroupId);
      if (moduleId) params.set("moduleId", moduleId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      return api.get(`/api/attendance?${params}`).then((r) => r.data);
    },
  });

  const { data: stats } = useQuery({ queryKey: ["attendance-stats"], queryFn: () => api.get("/api/attendance/stats").then((r) => r.data.data) });
  const { data: checkInsPerDay } = useQuery({ queryKey: ["checkins-per-day"], queryFn: () => api.get("/api/attendance/charts/checkins-per-day").then((r) => r.data.data) });
  const { data: peakHours } = useQuery({ queryKey: ["peak-hours"], queryFn: () => api.get("/api/attendance/charts/peak-hours").then((r) => r.data.data) });
  const { data: byGroup } = useQuery({ queryKey: ["by-group"], queryFn: () => api.get("/api/attendance/charts/by-class-department").then((r) => r.data.data) });

  const exportCsv = () => {
    if (!attendance?.data) return;
    const header = "Student,Email,RFID,Status,Module,Session,Check-in,Check-out,Score\n";
    const rows = attendance.data.map((log: any) =>
      `"${log.user?.firstName || ""} ${log.user?.lastName || ""}","${log.user?.email || ""}","${log.rfidUid}","${log.status}","${log.module?.name || ""}","${log.moduleSession ? `${log.moduleSession.startTime}-${log.moduleSession.endTime}` : ""}","${log.checkInAt}","${log.checkOutAt || ""}","${log.similarityScore || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attendance.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">View attendance logs, stats, and charts</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Students" value={stats?.totalUsers ?? "-"} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Today Check-ins" value={stats?.todayCheckIns ?? "-"} icon={<CheckCircle className="h-4 w-4 text-green-500" />} />
        <StatCard title="Failed Today" value={stats?.todayFailedAttempts ?? "-"} icon={<XCircle className="h-4 w-4 text-red-500" />} />
        <StatCard title="Avg Score" value={stats?.averageVerificationScore ?? "-"} icon={<Activity className="h-4 w-4 text-blue-500" />} />
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-48" />
            <select className="border rounded-md px-3 py-2 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="FAILED">Failed</option>
              <option value="CHECKED_OUT">Checked Out</option>
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => { setClassGroupId(e.target.value); setPage(1); }}>
              <option value="">All Classes</option>
              {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.speciality?.name})</option>)}
            </select>
            <select className="border rounded-md px-3 py-2 text-sm" value={moduleId} onChange={(e) => { setModuleId(e.target.value); setPage(1); }}>
              <option value="">All Modules</option>
              {modules?.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-left">Class</th>
                  <th className="px-3 py-2 text-left">Module</th>
                  <th className="px-3 py-2 text-left">Session</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Check-in</th>
                  <th className="px-3 py-2 text-left">Check-out</th>
                </tr>
              </thead>
              <tbody>
                {attendance?.data?.map((log: any) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{log.user?.firstName} {log.user?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{log.user?.studentId}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{log.user?.classGroup?.name}</td>
                    <td className="px-3 py-2 text-xs">{log.module?.name || "-"}</td>
                    <td className="px-3 py-2 text-xs">{log.moduleSession ? `${log.moduleSession.startTime}-${log.moduleSession.endTime}` : "-"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={log.status === "PRESENT" ? "default" : log.status === "CHECKED_OUT" ? "secondary" : "destructive"}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{log.similarityScore ? `${(log.similarityScore * 100).toFixed(1)}%` : "-"}</td>
                    <td className="px-3 py-2 text-xs">{new Date(log.checkInAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">{log.checkOutAt ? new Date(log.checkOutAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {attendance?.data?.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No attendance records found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {attendance?.pagination && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {attendance.pagination.page} of {attendance.pagination.totalPages} ({attendance.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= attendance.pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Check-ins per Day (30 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={checkInsPerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Peak Hours</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={peakHours || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Attendance by Module/Class</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={byGroup || []} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={100} label>
                      {(byGroup || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
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
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
