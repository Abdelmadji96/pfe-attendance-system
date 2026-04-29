"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useUserScope } from "@/hooks/use-scope";

export default function UsersPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [level, setLevel] = useState("");
  const [classGroupId, setClassGroupId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
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

  const { data: scopedSpecialities } = useQuery({
    queryKey: ["scopeSpecialities", effectiveDeptId],
    queryFn: () => api.get(`/api/master-data/specialities?departmentId=${effectiveDeptId}`).then((r) => r.data.data),
    enabled: !!effectiveDeptId,
  });

  const { data: allSpecialities } = useQuery({
    queryKey: ["allSpecialities"],
    queryFn: () => api.get("/api/master-data/specialities").then((r) => r.data.data),
    enabled: !effectiveDeptId,
  });

  const specialities = effectiveDeptId ? scopedSpecialities : allSpecialities;

  const { data: levels } = useQuery<string[]>({
    queryKey: ["academic-levels"],
    queryFn: () => api.get("/api/master-data/levels").then((r) => r.data.data),
  });

  const { data: allClassGroups } = useQuery({
    queryKey: ["allClassGroups"],
    queryFn: () => api.get("/api/master-data/class-groups").then((r) => r.data.data),
  });

  const classGroups = (() => {
    let groups = effectiveDeptId && scopedSpecialities
      ? allClassGroups?.filter((cg: any) => scopedSpecialities.some((s: any) => s.id === cg.specialityId))
      : allClassGroups;
    if (specialityId) {
      groups = groups?.filter((cg: any) => cg.specialityId === specialityId);
    }
    if (level) {
      groups = groups?.filter((cg: any) => cg.level === level);
    }
    return groups;
  })();

  const { data: result } = useQuery({
    queryKey: ["users", page, search, universityId, facultyId, departmentId, classGroupId, specialityId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (classGroupId) params.set("classGroupId", classGroupId);
      else if (specialityId) params.set("specialityId", specialityId);
      else if (departmentId) params.set("departmentId", departmentId);
      else if (facultyId) params.set("facultyId", facultyId);
      else if (universityId) params.set("universityId", universityId);
      return api.get(`/api/users?${params}`).then((r) => r.data);
    },
  });

  const filteredData = (() => {
    if (!result?.data) return [];
    let data = result.data;
    if (statusFilter === "active") data = data.filter((u: any) => u.isActive);
    if (statusFilter === "inactive") data = data.filter((u: any) => !u.isActive);
    if (level && !classGroupId) {
      data = data.filter((u: any) => u.classGroup?.level === level);
    }
    return data;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("students")}</h1>
        <p className="text-muted-foreground">{t("manage-students")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder={t("search-students")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-72" />
        {showAllFilters && (
          <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); setPage(1); }}>
            <option value="">{t("all-universities")}</option>
            {universities?.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
        {showFacultyFilter && (
          <select className="border rounded-md px-3 py-2 text-sm" value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); setPage(1); }}>
            <option value="">{t("all-faculties")}</option>
            {faculties?.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        {showFacultyFilter && (
          <select className="border rounded-md px-3 py-2 text-sm" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); setPage(1); }}>
            <option value="">{t("all-departments")}</option>
            {departments?.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        <select className="border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); setPage(1); }}>
          <option value="">{t("all-specialities")}</option>
          {specialities?.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm" value={level} onChange={(e) => { setLevel(e.target.value); setClassGroupId(""); setPage(1); }}>
          <option value="">{t("all-levels")}</option>
          {(levels || []).map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => { setClassGroupId(e.target.value); setPage(1); }}>
          <option value="">{t("all-classes")}</option>
          {classGroups?.map((cg: any) => (
            <option key={cg.id} value={cg.id}>{cg.name} - {cg.speciality?.name} ({cg.level})</option>
          ))}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}>
          <option value="">{t("all-status")}</option>
          <option value="active">{t("active")}</option>
          <option value="inactive">{t("inactive")}</option>
        </select>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t("name")}</th>
              <th className="px-3 py-2 text-start">{t("email")}</th>
              <th className="px-3 py-2 text-start">{t("student-id")}</th>
              <th className="px-3 py-2 text-start">{t("class-group")}</th>
              <th className="px-3 py-2 text-start">{t("speciality")}</th>
              <th className="px-3 py-2 text-start">{t("level")}</th>
              <th className="px-3 py-2 text-start">{t("rfid")}</th>
              <th className="px-3 py-2 text-start">{t("status")}</th>
              <th className="px-3 py-2 text-start"></th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((user: any) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2 font-medium">{user.firstName} {user.lastName}</td>
                <td className="px-3 py-2 text-xs">{user.email}</td>
                <td className="px-3 py-2">{user.studentId || "-"}</td>
                <td className="px-3 py-2 text-xs">{user.classGroup ? user.classGroup.name : "-"}</td>
                <td className="px-3 py-2 text-xs">{user.classGroup?.speciality?.name || "-"}</td>
                <td className="px-3 py-2 text-xs">{user.classGroup?.level || "-"}</td>
                <td className="px-3 py-2 text-xs">{user.rfidCard?.uid || "-"}</td>
                <td className="px-3 py-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? t("active") : t("inactive")}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/users/${user.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">{t("no-students-found")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {result?.pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("page-of").replace("{page}", String(result.pagination.page)).replace("{totalPages}", String(result.pagination.totalPages)).replace("{total}", String(result.pagination.total))}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= result.pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
