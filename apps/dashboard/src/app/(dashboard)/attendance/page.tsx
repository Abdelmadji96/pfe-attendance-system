"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, XCircle, Activity, ChevronLeft, ChevronRight, Download, CalendarDays, TrendingUp, ClipboardList } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useUserScope } from "@/hooks/use-scope";

type TimeRange = "" | "today" | "last-week" | "last-month" | "3-months" | "6-months" | "last-year";

function getDateRange(range: TimeRange): { dateFrom: string; dateTo: string } | null {
  if (!range) return null;

  const now = new Date();
  const to = now.toISOString().split("T")[0];
  const from = new Date();

  switch (range) {
    case "today":
      return { dateFrom: to, dateTo: to };
    case "last-week":
      from.setDate(from.getDate() - 7);
      return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
    case "last-month":
      from.setMonth(from.getMonth() - 1);
      return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
    case "3-months":
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
    case "6-months":
      from.setMonth(from.getMonth() - 6);
      return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
    case "last-year":
      from.setFullYear(from.getFullYear() - 1);
      return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
    default:
      return null;
  }
}

export default function AttendancePage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [level, setLevel] = useState("");

  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [timeRange, setTimeRange] = useState<TimeRange>("");

  const scope = useUserScope();
  const showAllFilters = !scope.isScoped;
  const showFacultyFilter = showAllFilters || scope.isSuperHrAdmin;

  const { data: universities } = useQuery({
    queryKey: ["universities"],
    queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data),
    enabled: showAllFilters,
  });

  const effectiveUniversityId = scope.isSuperHrAdmin ? (scope.universityId ?? "") : universityId;

  const { data: faculties } = useQuery({
    queryKey: ["faculties", effectiveUniversityId],
    queryFn: () => {
      const url = effectiveUniversityId
        ? `/api/master-data/faculties?universityId=${effectiveUniversityId}`
        : "/api/master-data/faculties";
      return api.get(url).then((r) => r.data.data);
    },
    enabled: showFacultyFilter,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", facultyId],
    queryFn: () => {
      const url = facultyId
        ? `/api/master-data/departments?facultyId=${facultyId}`
        : "/api/master-data/departments";
      return api.get(url).then((r) => r.data.data);
    },
    enabled: showFacultyFilter,
  });

  const effectiveDeptId = scope.isHrAdmin ? (scope.departmentId ?? undefined) : (departmentId || undefined);

  const specialityQuery = effectiveDeptId
    ? `/api/master-data/specialities?departmentId=${effectiveDeptId}`
    : "/api/master-data/specialities";

  const { data: rawSpecialities } = useQuery({
    queryKey: ["allSpecialities", effectiveDeptId],
    queryFn: () => api.get(specialityQuery).then((r) => r.data.data),
  });

  const specialities = scope.isSuperHrAdmin && scope.universityId && !departmentId
    ? rawSpecialities?.filter((s: any) => s.department?.faculty?.universityId === scope.universityId)
    : rawSpecialities;

  const { data: rawClassGroups } = useQuery({
    queryKey: ["classGroupsBySpeciality", specialityId, scope.departmentId],
    queryFn: () => {
      const url = specialityId
        ? `/api/master-data/class-groups?specialityId=${specialityId}`
        : "/api/master-data/class-groups";
      return api.get(url).then((r) => r.data.data);
    },
  });

  const classGroups = (() => {
    if (!rawClassGroups) return rawClassGroups;
    if (specialityId) return rawClassGroups;
    if (scope.isScoped && specialities?.length) {
      const scopedIds = specialities.map((s: any) => s.id);
      return rawClassGroups.filter((cg: any) => scopedIds.includes(cg.specialityId));
    }
    return rawClassGroups;
  })();

  const filteredClassGroups = classGroups?.filter((cg: any) =>
    level ? cg.level === level : true
  );

  const availableLevels = classGroups
    ? [...new Set(classGroups.map((cg: any) => cg.level).filter(Boolean))]
    : [];

  const computedRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  const statsDateFrom = computedRange?.dateFrom || dateFrom || (singleDate && dateMode === "single" ? singleDate : undefined);
  const statsDateTo = computedRange?.dateTo || dateTo || (singleDate && dateMode === "single" ? singleDate : undefined);

  function buildDateParams(): string {
    const params = new URLSearchParams();
    if (computedRange) {
      params.set("dateFrom", computedRange.dateFrom);
      params.set("dateTo", computedRange.dateTo);
    } else if (statsDateFrom) {
      params.set("dateFrom", statsDateFrom);
      if (statsDateTo) params.set("dateTo", statsDateTo);
    }
    return params.toString();
  }

  const { data: attendance } = useQuery({
    queryKey: ["attendance", page, search, universityId, facultyId, departmentId, specialityId, classGroupId, level, dateMode, singleDate, dateFrom, dateTo, timeRange],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (classGroupId) params.set("classGroupId", classGroupId);
      else if (specialityId) params.set("specialityId", specialityId);
      else if (departmentId) params.set("departmentId", departmentId);
      else if (facultyId) params.set("facultyId", facultyId);
      else if (universityId) params.set("universityId", universityId);
      if (computedRange) {
        params.set("dateFrom", computedRange.dateFrom);
        params.set("dateTo", computedRange.dateTo);
      } else if (dateMode === "single" && singleDate) {
        params.set("date", singleDate);
      } else if (dateMode === "range") {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
      return api.get(`/api/attendance?${params}`).then((r) => r.data);
    },
  });

  const dateParamsStr = buildDateParams();

  const { data: stats } = useQuery({
    queryKey: ["attendance-stats", dateParamsStr],
    queryFn: () => api.get(`/api/attendance/stats${dateParamsStr ? `?${dateParamsStr}` : ""}`).then((r) => r.data.data),
  });

  const { data: checkInsPerDay } = useQuery({
    queryKey: ["checkins-per-day", dateParamsStr],
    queryFn: () => api.get(`/api/attendance/charts/checkins-per-day${dateParamsStr ? `?${dateParamsStr}` : ""}`).then((r) => r.data.data),
  });

  const { data: peakHours } = useQuery({
    queryKey: ["peak-hours", dateParamsStr],
    queryFn: () => api.get(`/api/attendance/charts/peak-hours${dateParamsStr ? `?${dateParamsStr}` : ""}`).then((r) => r.data.data),
  });

  const { data: byGroup } = useQuery({
    queryKey: ["by-group", dateParamsStr],
    queryFn: () => api.get(`/api/attendance/charts/by-class-department${dateParamsStr ? `?${dateParamsStr}` : ""}`).then((r) => r.data.data),
  });

  const exportCsv = () => {
    if (!attendance?.data) return;
    const header = `${t("full-name")},${t("student-id")},${t("level")},${t("class")},${t("major")},${t("check-in")},${t("check-out")}\n`;
    const rows = attendance.data.map((log: any) =>
      `"${log.user?.firstName || ""} ${log.user?.lastName || ""}","${log.user?.studentId || ""}","${log.user?.classGroup?.level || ""}","${log.user?.classGroup?.name || ""}","${log.user?.classGroup?.speciality?.name || ""}","${log.checkInAt}","${log.checkOutAt || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "attendance.csv"; a.click();
  };

  const resetFilters = () => {
    setSearch(""); setUniversityId(""); setFacultyId(""); setDepartmentId("");
    setSpecialityId(""); setClassGroupId(""); setLevel("");
    setSingleDate(""); setDateFrom(""); setDateTo(""); setTimeRange(""); setPage(1);
  };

  const TIME_RANGE_KEYS: Record<TimeRange, string> = {
    "": "all-time",
    "today": "today",
    "last-week": "last-week",
    "last-month": "last-month",
    "3-months": "3-months",
    "6-months": "6-months",
    "last-year": "last-year",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-biskra-secondary">{t("attendance")}</h1>
          <p className="text-muted-foreground">{t("view-attendance-logs")}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background font-medium"
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value as TimeRange);
              setSingleDate(""); setDateFrom(""); setDateTo(""); setPage(1);
            }}
          >
            {Object.entries(TIME_RANGE_KEYS).map(([value, key]) => (
              <option key={value} value={value}>{t(key)}</option>
            ))}
          </select>
          <Button variant="outline" onClick={exportCsv}><Download className="me-2 h-4 w-4" />{t("export-csv")}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("total-students")} value={stats?.totalUsers ?? "-"} icon={Users} gradient="from-[#1B5E20] to-[#0D3B13]" />
        <StatCard title={t("checkins")} value={stats?.todayCheckIns ?? "-"} icon={CheckCircle} gradient="from-emerald-500 to-emerald-600" />
        <StatCard title={t("failed-attempts")} value={stats?.todayFailedAttempts ?? "-"} icon={XCircle} gradient="from-red-500 to-red-600" />
        <StatCard title={t("avg-score")} value={stats?.averageVerificationScore ?? "-"} icon={Activity} gradient="from-[#D4AF37] to-[#b8962e]" />
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">{t("table")}</TabsTrigger>
          <TabsTrigger value="charts">{t("charts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              {(showAllFilters || showFacultyFilter) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  {showAllFilters && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("university")}</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={universityId}
                        onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); setPage(1); }}
                      >
                        <option value="">{t("all-universities")}</option>
                        {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  )}

                  {showFacultyFilter && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("faculty")}</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={facultyId}
                        onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); setPage(1); }}
                      >
                        <option value="">{t("all-faculties")}</option>
                        {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  )}

                  {showFacultyFilter && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("department")}</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={departmentId}
                        onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); setPage(1); }}
                      >
                        <option value="">{t("all-departments")}</option>
                        {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("search-name-id")}</Label>
                  <Input placeholder={t("search-placeholder")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("major-speciality")}</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={specialityId}
                    onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); setPage(1); }}
                  >
                    <option value="">{t("all-majors")}</option>
                    {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("level")}</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={level}
                    onChange={(e) => { setLevel(e.target.value); setClassGroupId(""); setPage(1); }}
                  >
                    <option value="">{t("all-levels")}</option>
                    {availableLevels.map((l: any) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("class")}</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={classGroupId}
                    onChange={(e) => { setClassGroupId(e.target.value); setPage(1); }}
                  >
                    <option value="">{t("all-classes")}</option>
                    {filteredClassGroups?.map((cg: any) => (
                      <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>
                    ))}
                  </select>
                </div>
              </div>

              {!timeRange && (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {t("date")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded-md px-2 py-2 text-sm bg-background"
                        value={dateMode}
                        onChange={(e) => {
                          setDateMode(e.target.value as "single" | "range");
                          setSingleDate(""); setDateFrom(""); setDateTo(""); setPage(1);
                        }}
                      >
                        <option value="single">{t("single-day")}</option>
                        <option value="range">{t("date-range")}</option>
                      </select>
                      {dateMode === "single" ? (
                        <Input type="date" value={singleDate} onChange={(e) => { setSingleDate(e.target.value); setPage(1); }} className="w-40" />
                      ) : (
                        <>
                          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
                          <span className="text-muted-foreground text-sm">{t("to")}</span>
                          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
                        </>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={resetFilters}>{t("clear-filters")}</Button>
                </div>
              )}

              {timeRange && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>{t("clear-filters")}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-start">{t("full-name")}</th>
                  <th className="px-3 py-2 text-start">{t("student-id")}</th>
                  <th className="px-3 py-2 text-start">{t("level")}</th>
                  <th className="px-3 py-2 text-start">{t("class")}</th>
                  <th className="px-3 py-2 text-start">{t("major")}</th>
                  <th className="px-3 py-2 text-start">{t("check-in")}</th>
                  <th className="px-3 py-2 text-start">{t("check-out")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance?.data?.map((log: any) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium">
                      {log.user?.firstName} {log.user?.lastName}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.user?.studentId || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.user?.classGroup?.level || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.user?.classGroup?.name || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.user?.classGroup?.speciality?.name || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(log.checkInAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {log.checkOutAt ? new Date(log.checkOutAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
                {attendance?.data?.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t("no-attendance-records")}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {attendance?.pagination && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("page-of").replace("{page}", String(attendance.pagination.page)).replace("{totalPages}", String(attendance.pagination.totalPages)).replace("{total}", String(attendance.pagination.total))}
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
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
                  <div className="rounded-lg p-2 bg-biskra-primary/10">
                    <TrendingUp className="h-4 w-4 text-biskra-primary" />
                  </div>
                  {t("total-checkins-per-day")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={checkInsPerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="var(--biskra-primary)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
                  <div className="rounded-lg p-2 bg-biskra-gold/20">
                    <ClipboardList className="h-4 w-4 text-biskra-gold" />
                  </div>
                  {t("peak-checkin-time")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={peakHours || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--biskra-primary-light)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-biskra-secondary text-base">
                  <div className="rounded-lg p-2 bg-biskra-primary/10">
                    <Users className="h-4 w-4 text-biskra-primary" />
                  </div>
                  {t("attendance-by-class")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byGroup || []} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="group" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--biskra-gold)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, gradient }: { title: string; value: any; icon: React.ElementType; gradient: string }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-200 card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-xl p-2.5 bg-gradient-to-br ${gradient} shadow-md`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-biskra-secondary">{value}</div>
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-60`} />
    </Card>
  );
}
