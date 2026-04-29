"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useUserScope } from "@/hooks/use-scope";
import { useI18n } from "@/lib/i18n";
import { RoleName } from "@pfe/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  UserCog,
  Power,
  Eye,
  EyeOff,
} from "lucide-react";

const ROLE_LABEL_KEYS: Record<string, string> = {
  [RoleName.MINISTER]: "minister",
  [RoleName.SUPER_HR_ADMIN]: "super-hr-admin",
  [RoleName.HR_ADMIN]: "hr-admin",
  [RoleName.PROFESSOR]: "professor",
};

function creatableRolesFor(actorRole: string): RoleName[] {
  switch (actorRole) {
    case RoleName.SUPER_ADMIN:
      return [RoleName.MINISTER, RoleName.SUPER_HR_ADMIN];
    case RoleName.SUPER_HR_ADMIN:
      return [RoleName.HR_ADMIN, RoleName.PROFESSOR];
    case RoleName.HR_ADMIN:
      return [RoleName.PROFESSOR];
    default:
      return [];
  }
}

function visibleRolesFor(actorRole: string): RoleName[] {
  switch (actorRole) {
    case RoleName.SUPER_ADMIN:
      return [RoleName.MINISTER, RoleName.SUPER_HR_ADMIN, RoleName.HR_ADMIN, RoleName.PROFESSOR];
    case RoleName.SUPER_HR_ADMIN:
      return [RoleName.HR_ADMIN, RoleName.PROFESSOR];
    case RoleName.HR_ADMIN:
      return [RoleName.PROFESSOR];
    default:
      return [];
  }
}

export default function StaffPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const scope = useUserScope();
  const { t } = useI18n();
  const actorRole = (user?.role?.name ?? "") as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterUniversityId, setFilterUniversityId] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [formRole, setFormRole] = useState<RoleName | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [selectedDepts, setSelectedDepts] = useState<
    { id: string; name: string; facultyName: string }[]
  >([]);

  const effectiveUniversityId = scope.isScoped
    ? scope.universityId!
    : universityId;

  const { data: universities } = useQuery({
    queryKey: ["universities"],
    queryFn: () =>
      api.get("/api/master-data/universities").then((r) => r.data.data),
  });
  const { data: faculties } = useQuery({
    queryKey: ["faculties", effectiveUniversityId],
    queryFn: () =>
      api
        .get(
          `/api/master-data/faculties?universityId=${effectiveUniversityId}`
        )
        .then((r) => r.data.data),
    enabled: !!effectiveUniversityId,
  });
  const { data: departments } = useQuery({
    queryKey: ["departments", facultyId],
    queryFn: () =>
      api
        .get(`/api/master-data/departments?facultyId=${facultyId}`)
        .then((r) => r.data.data),
    enabled: !!facultyId,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["staff", page, search, filterRole, filterUniversityId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (filterRole) params.set("role", filterRole);
      if (filterUniversityId) params.set("universityId", filterUniversityId);
      return api.get(`/api/staff?${params}`).then((r) => r.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/staff", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });

  function resetForm() {
    setShowForm(false);
    setFormRole("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setUniversityId("");
    setFacultyId("");
    setDepartmentId("");
    setSelectedDepts([]);
    setShowPassword(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isProfessor = formRole === RoleName.PROFESSOR;
    createMutation.mutate({
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
      role: formRole,
      universityId: effectiveUniversityId || undefined,
      ...(isProfessor
        ? { departmentIds: selectedDepts.map((d) => d.id) }
        : { facultyId: facultyId || undefined, departmentId: departmentId || undefined }),
    });
  }

  function toggleDept(dept: any, currentFacultyName: string) {
    setSelectedDepts((prev) => {
      const exists = prev.find((d) => d.id === dept.id);
      if (exists) return prev.filter((d) => d.id !== dept.id);
      return [...prev, { id: dept.id, name: dept.name, facultyName: currentFacultyName }];
    });
  }

  const showUniversitySelector =
    actorRole === RoleName.SUPER_ADMIN &&
    (formRole === RoleName.SUPER_HR_ADMIN || formRole === RoleName.HR_ADMIN);

  const creatableRoles = creatableRolesFor(actorRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("staff-management")}
          </h1>
          <p className="text-muted-foreground">
            {t("manage-staff")}
          </p>
        </div>
        {creatableRoles.length > 0 && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? (
              <X className="me-2 h-4 w-4" />
            ) : (
              <Plus className="me-2 h-4 w-4" />
            )}
            {showForm ? t("cancel") : t("add-staff")}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {t("add-new-staff")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("role")}</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={formRole}
                    onChange={(e) => {
                      setFormRole(e.target.value as RoleName);
                      setFacultyId("");
                      setDepartmentId("");
                      setSelectedDepts([]);
                      if (!scope.isScoped) setUniversityId("");
                    }}
                    required
                  >
                    <option value="">{t("select-role")}</option>
                    {creatableRoles.map((r) => (
                      <option key={r} value={r}>
                        {t(ROLE_LABEL_KEYS[r] || r)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("first-name")}</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("last-name")}</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("password")}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("phone-optional")}</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {showUniversitySelector && (
                  <div className="space-y-2">
                    <Label>{t("university")}</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={universityId}
                      onChange={(e) => {
                        setUniversityId(e.target.value);
                        setFacultyId("");
                        setDepartmentId("");
                      }}
                      required
                    >
                      <option value="">{t("select-university")}</option>
                      {universities?.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formRole === RoleName.HR_ADMIN && (
                  <>
                    <div className="space-y-2">
                      <Label>{t("faculty")}</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={facultyId}
                        onChange={(e) => {
                          setFacultyId(e.target.value);
                          setDepartmentId("");
                        }}
                        disabled={!scope.isScoped && !universityId}
                        required
                      >
                        <option value="">{t("select-faculty")}</option>
                        {faculties?.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("department")}</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        disabled={!facultyId}
                        required
                      >
                        <option value="">{t("select-department")}</option>
                        {departments?.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {formRole === RoleName.PROFESSOR && (
                  <div className="md:col-span-2 space-y-3">
                    <Label>{t("departments-select")}</Label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={facultyId}
                          onChange={(e) => setFacultyId(e.target.value)}
                          disabled={!scope.isScoped && !universityId && !effectiveUniversityId}
                        >
                          <option value="">{t("pick-faculty-browse")}</option>
                          {faculties?.map((f: any) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>

                        {facultyId && (
                          <div className="border rounded-md max-h-44 overflow-y-auto">
                            {departments?.length === 0 && (
                              <p className="text-xs text-muted-foreground p-2">
                                {t("no-departments-faculty")}
                              </p>
                            )}
                            {departments?.map((d: any) => {
                              const checked = selectedDepts.some(
                                (s) => s.id === d.id
                              );
                              const currentFaculty = faculties?.find(
                                (f: any) => f.id === facultyId
                              );
                              return (
                                <label
                                  key={d.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-b-0"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleDept(d, currentFaculty?.name ?? "")
                                    }
                                    className="rounded"
                                  />
                                  {d.name}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {t("selected")} ({selectedDepts.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5 min-h-[2.5rem]">
                          {selectedDepts.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">
                              {t("no-departments-selected")}
                            </p>
                          )}
                          {selectedDepts.map((d) => (
                            <Badge
                              key={d.id}
                              variant="secondary"
                              className="flex items-center gap-1 text-xs"
                            >
                              {d.facultyName} &rarr; {d.name}
                              <button
                                type="button"
                                className="hover:text-destructive"
                                onClick={() =>
                                  setSelectedDepts((prev) =>
                                    prev.filter((x) => x.id !== d.id)
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {(createMutation.error as any)?.response?.data?.message ||
                    t("failed-create-staff")}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !formRole}
                >
                  {createMutation.isPending && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {t("create-staff")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder={t("search-name-email")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-72"
        />
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("all-roles")}</option>
          {visibleRolesFor(actorRole).map((r) => (
            <option key={r} value={r}>
              {t(ROLE_LABEL_KEYS[r] || r)}
            </option>
          ))}
        </select>

        {actorRole === RoleName.SUPER_ADMIN && (
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={filterUniversityId}
            onChange={(e) => {
              setFilterUniversityId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("all-universities")}</option>
            {universities?.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-start">{t("name")}</th>
              <th className="px-3 py-2 text-start">{t("email")}</th>
              <th className="px-3 py-2 text-start">{t("role")}</th>
              <th className="px-3 py-2 text-start">{t("university")}</th>
              <th className="px-3 py-2 text-start">{t("faculty")}</th>
              <th className="px-3 py-2 text-start">{t("department")}</th>
              <th className="px-3 py-2 text-start">{t("status")}</th>
              <th className="px-3 py-2 text-start">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {result?.data?.map((staff: any) => (
              <tr key={staff.id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  {staff.firstName} {staff.lastName}
                </td>
                <td className="px-3 py-2 text-xs">{staff.email}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">
                    {t(ROLE_LABEL_KEYS[staff.role?.name] || staff.role?.name)}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  {staff.university?.name || "-"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {staff.professorDepartments?.length > 0
                    ? [...new Set(staff.professorDepartments.map((pd: any) => pd.department?.faculty?.name).filter(Boolean))].join(", ")
                    : staff.faculty?.name || "-"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {staff.professorDepartments?.length > 0
                    ? staff.professorDepartments.map((pd: any) => pd.department?.name).filter(Boolean).join(", ")
                    : staff.department?.name || "-"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={staff.isActive ? "default" : "secondary"}>
                    {staff.isActive ? t("active") : t("inactive")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={staff.isActive ? t("deactivate") : t("activate")}
                    onClick={() => toggleMutation.mutate(staff.id)}
                    disabled={toggleMutation.isPending}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && result?.data?.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {t("no-staff-found")}
                </td>
              </tr>
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
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (result.pagination.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
