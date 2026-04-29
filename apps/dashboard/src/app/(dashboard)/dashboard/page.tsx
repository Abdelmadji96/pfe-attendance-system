"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, CheckCircle, XCircle, Activity,
  TrendingUp, CreditCard, ScanFace,
  BookOpen, ArrowUpRight, ArrowDownRight, Clock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#1B5E20", "#e5e7eb"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-enhanced-stats"],
    queryFn: () => api.get("/api/attendance/dashboard-stats").then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: checkInsPerDay } = useQuery({
    queryKey: ["dashboard-checkins"],
    queryFn: () => api.get("/api/attendance/charts/checkins-per-day").then((r) => r.data.data),
  });

  const { data: peakHours } = useQuery({
    queryKey: ["dashboard-peak"],
    queryFn: () => api.get("/api/attendance/charts/peak-hours").then((r) => r.data.data),
  });

  const { data: byGroup } = useQuery({
    queryKey: ["dashboard-by-group"],
    queryFn: () => api.get("/api/attendance/charts/by-class-department").then((r) => r.data.data),
  });

  const trendIcon = (stats?.todayVsYesterday ?? 0) >= 0
    ? <ArrowUpRight className="h-3.5 w-3.5" />
    : <ArrowDownRight className="h-3.5 w-3.5" />;
  const trendColor = (stats?.todayVsYesterday ?? 0) >= 0
    ? "text-emerald-600"
    : "text-red-500";

  const rfidPieData = stats ? [
    { name: t("enrolled"), value: stats.enrolledWithRfid },
    { name: t("not-enrolled"), value: stats.totalStudents - stats.enrolledWithRfid },
  ] : [];

  const facePieData = stats ? [
    { name: t("enrolled"), value: stats.enrolledWithFace },
    { name: t("not-enrolled"), value: stats.totalStudents - stats.enrolledWithFace },
  ] : [];

  const statCards = [
    {
      title: t("total-students"),
      value: stats?.totalStudents ?? 0,
      sub: null,
      icon: Users,
      gradient: "from-[#1B5E20] to-[#0D3B13]",
    },
    {
      title: t("today-attendance"),
      value: `${stats?.attendanceRate ?? 0}%`,
      sub: `${stats?.todayUniqueStudents ?? 0} ${t("unique-students-today")}`,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      trend: stats?.todayVsYesterday,
    },
    {
      title: t("success-rate"),
      value: `${stats?.successRate ?? 0}%`,
      sub: `${stats?.avgVerificationScore ?? 0}% ${t("verification-accuracy")}`,
      icon: Activity,
      gradient: "from-[#D4AF37] to-[#b8962e]",
    },
    {
      title: t("active-modules"),
      value: stats?.activeModules ?? 0,
      sub: t("running-now"),
      icon: BookOpen,
      gradient: "from-blue-500 to-blue-600",
    },
  ];

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded bg-muted ${className}`} />
  );

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-biskra-secondary via-biskra-secondary to-biskra-primary p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-biskra-gold/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-biskra-primary/30 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("welcome").replace("{name}", user?.firstName || "Admin")}
            </h1>
            <p className="mt-2 text-white/70">
              {t("logged-in-as")}{" "}
              <span className="font-medium text-biskra-gold">
                {user?.role.name.replace(/_/g, " ") || "User"}
              </span>
            </p>
          </div>
          {!isLoading && stats && (
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.todayCheckIns}</div>
                <div className="text-white/60">{t("today-checkins")}</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.weekCheckIns}</div>
                <div className="text-white/60">{t("this-week")}</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.monthCheckIns}</div>
                <div className="text-white/60">{t("this-month")}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-xl p-2.5 bg-gradient-to-br ${stat.gradient} shadow-md`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-biskra-secondary">
                        {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                      </span>
                      {stat.trend !== undefined && stat.trend !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor} mb-1`}>
                          {trendIcon}
                          {Math.abs(stat.trend)}% {t("vs-yesterday")}
                        </span>
                      )}
                    </div>
                    {stat.sub && (
                      <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    )}
                  </>
                )}
              </CardContent>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-60`} />
            </Card>
          );
        })}
      </div>

      {/* Quick summary strip */}
      {!isLoading && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-sm bg-red-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-700">{stats.todayFailed}</div>
                <div className="text-xs text-red-600/80">{t("failed-attempts")} {t("today-checkins").toLowerCase()}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-blue-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">{stats.rfidEnrollmentRate}%</div>
                <div className="text-xs text-blue-600/80">{t("rfid-enrolled")} ({stats.enrolledWithRfid}/{stats.totalStudents})</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-purple-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg p-2 bg-purple-100">
                <ScanFace className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-700">{stats.faceEnrollmentRate}%</div>
                <div className="text-xs text-purple-600/80">{t("face-enrolled")} ({stats.enrolledWithFace}/{stats.totalStudents})</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-biskra-secondary">
              <div className="rounded-lg p-2 bg-biskra-primary/10">
                <TrendingUp className="h-5 w-5 text-biskra-primary" />
              </div>
              {t("checkins-30-days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={checkInsPerDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--biskra-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--biskra-primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-biskra-secondary">
              <div className="rounded-lg p-2 bg-biskra-gold/20">
                <Clock className="h-5 w-5 text-biskra-gold" />
              </div>
              {t("peak-checkin-time")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="count" fill="var(--biskra-primary-light)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: enrollment pies + attendance by class */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
              <div className="rounded-lg p-2 bg-biskra-primary/10">
                <CreditCard className="h-4 w-4 text-biskra-primary" />
              </div>
              {t("rfid-cards")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={rfidPieData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {rfidPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-2">
                  <div className="text-2xl font-bold text-biskra-secondary">{stats?.rfidEnrollmentRate}%</div>
                  <div className="text-xs text-muted-foreground">{stats?.enrolledWithRfid} / {stats?.totalStudents} {t("enrolled").toLowerCase()}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
              <div className="rounded-lg p-2 bg-purple-100">
                <ScanFace className="h-4 w-4 text-purple-600" />
              </div>
              {t("face-recognition")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={facePieData}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {facePieData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#7c3aed" : "#e5e7eb"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-2">
                  <div className="text-2xl font-bold text-biskra-secondary">{stats?.faceEnrollmentRate}%</div>
                  <div className="text-xs text-muted-foreground">{stats?.enrolledWithFace} / {stats?.totalStudents} {t("enrolled").toLowerCase()}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
              <div className="rounded-lg p-2 bg-biskra-primary/10">
                <Users className="h-4 w-4 text-biskra-primary" />
              </div>
              {t("attendance-by-class")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(byGroup || []).slice(0, 6)} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#999" />
                <YAxis dataKey="group" type="category" tick={{ fontSize: 10 }} width={60} stroke="#999" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="count" fill="var(--biskra-gold)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
