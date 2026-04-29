"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload } from "lucide-react";
import CsvImportDialog from "@/components/csv-import-dialog";
import { useUserScope } from "@/hooks/use-scope";

type Entity = "universities" | "faculties" | "departments" | "specialities" | "class-groups" | "levels" | "rooms";

export default function MasterDataPage() {
  const { isScoped } = useUserScope();
  const { t } = useI18n();
  const [tab, setTab] = useState<Entity>(isScoped ? "faculties" : "universities");

  const visibleTabs = isScoped
    ? (["faculties", "departments", "specialities", "levels", "class-groups", "rooms"] as Entity[])
    : (["universities", "faculties", "departments", "specialities", "levels", "class-groups", "rooms"] as Entity[]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("master-data")}</h1>
          <p className="text-muted-foreground">{t("manage-academic-hierarchy")}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Entity)}>
        <TabsList className={`grid w-full ${isScoped ? "grid-cols-6" : "grid-cols-7"}`}>
          {visibleTabs.includes("universities") && <TabsTrigger value="universities">{t("universities")}</TabsTrigger>}
          <TabsTrigger value="faculties">{t("faculties")}</TabsTrigger>
          <TabsTrigger value="departments">{t("departments")}</TabsTrigger>
          <TabsTrigger value="specialities">{t("specialities")}</TabsTrigger>
          <TabsTrigger value="levels">{t("levels")}</TabsTrigger>
          <TabsTrigger value="class-groups">{t("classes")}</TabsTrigger>
          <TabsTrigger value="rooms">{t("rooms")}</TabsTrigger>
        </TabsList>

        {!isScoped && <TabsContent value="universities"><UniversityTab /></TabsContent>}
        <TabsContent value="faculties"><FacultyTab /></TabsContent>
        <TabsContent value="departments"><DepartmentTab /></TabsContent>
        <TabsContent value="specialities"><SpecialityTab /></TabsContent>
        <TabsContent value="levels"><LevelTab /></TabsContent>
        <TabsContent value="class-groups"><ClassGroupTab /></TabsContent>
        <TabsContent value="rooms"><RoomTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UniversityTab() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/universities", { name, code: code || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); setName(""); setCode(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/universities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["universities"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("universities")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={t("code-optional")} value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
          <Button type="submit" disabled={!name}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{u.name}</span> {u.code && <Badge variant="outline" className="ms-2">{u.code}</Badge>}</div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-universities-yet")}</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="university" requiredColumns={["name", "code"]} />
    </Card>
  );
}

function FacultyTab() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState(scope.universityId || "");
  const [csvOpen, setCsvOpen] = useState(false);

  const effectiveUniversityId = scope.isScoped ? scope.universityId! : universityId;

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: allFaculties } = useQuery({
    queryKey: ["faculties", effectiveUniversityId],
    queryFn: () => api.get(`/api/master-data/faculties${effectiveUniversityId ? `?universityId=${effectiveUniversityId}` : ""}`).then((r) => r.data.data),
  });

  const data = scope.isHrAdmin && scope.facultyId
    ? allFaculties?.filter((f: any) => f.id === scope.facultyId)
    : allFaculties;

  const scopedUniversityName = scope.isScoped && universities
    ? universities.find((u: any) => u.id === scope.universityId)?.name
    : null;

  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/faculties", { name, universityId: effectiveUniversityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculties"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/faculties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faculties"] }),
  });

  const canEdit = !scope.isHrAdmin;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("faculties")}</CardTitle>
        {canEdit && <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
            {scope.isScoped ? (
              <select className="border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed" disabled>
                <option>{scopedUniversityName || t("your-university")}</option>
              </select>
            ) : (
              <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
                <option value="">{t("select-university")}</option>
                {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            <Input placeholder={t("faculty-name")} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={!name || !effectiveUniversityId}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
          </form>
        )}
        <div className="divide-y rounded-md border">
          {data?.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{f.name}</span> <Badge variant="secondary" className="ms-2">{f.university?.name}</Badge></div>
              {canEdit && <Button variant="ghost" size="icon" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-faculties-yet")}</p>}
        </div>
      </CardContent>
      {canEdit && <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="faculty" requiredColumns={["name", "universityCode"]} />}
    </Card>
  );
}

function DepartmentTab() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [facultyId, setFacultyId] = useState(scope.facultyId || "");
  const [csvOpen, setCsvOpen] = useState(false);

  const effectiveFacultyId = scope.isHrAdmin ? scope.facultyId! : facultyId;

  const { data: faculties } = useQuery({ queryKey: ["faculties"], queryFn: () => api.get("/api/master-data/faculties").then((r) => r.data.data) });

  const scopedFacultyName = scope.isHrAdmin && faculties
    ? faculties.find((f: any) => f.id === scope.facultyId)?.name
    : null;

  const { data } = useQuery({
    queryKey: ["departments", effectiveFacultyId, scope.isHrAdmin ? scope.departmentId : ""],
    queryFn: () => api.get(`/api/master-data/departments${effectiveFacultyId ? `?facultyId=${effectiveFacultyId}` : ""}`).then((r) => {
      if (scope.isHrAdmin && scope.departmentId) {
        return r.data.data.filter((d: any) => d.id === scope.departmentId);
      }
      return r.data.data;
    }),
  });

  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/departments", { name, facultyId: effectiveFacultyId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });

  const canEdit = !scope.isHrAdmin;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("departments")}</CardTitle>
        {canEdit && <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit && (
          <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
            {scope.isHrAdmin ? (
              <select className="border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed whitespace-nowrap" disabled>
                <option>{scopedFacultyName || t("your-faculty")}</option>
              </select>
            ) : (
              <select className="border rounded-md px-3 py-2 text-sm" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                <option value="">{t("select-faculty")}</option>
                {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
            <Input placeholder={t("department-name")} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={!name || !effectiveFacultyId}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
          </form>
        )}
        <div className="divide-y rounded-md border">
          {data?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{d.name}</span> <Badge variant="secondary" className="ms-2">{d.faculty?.name}</Badge></div>
              {canEdit && <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-departments-yet")}</p>}
        </div>
      </CardContent>
      {canEdit && <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="department" requiredColumns={["name", "facultyName", "universityCode"]} />}
    </Card>
  );
}

function SpecialityTab() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState(scope.departmentId || "");
  const [csvOpen, setCsvOpen] = useState(false);

  const effectiveDepartmentId = scope.isHrAdmin ? scope.departmentId! : departmentId;

  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => api.get("/api/master-data/departments").then((r) => r.data.data) });

  const scopedDepartmentName = scope.isHrAdmin && departments
    ? departments.find((d: any) => d.id === scope.departmentId)?.name
    : null;

  const { data } = useQuery({ queryKey: ["specialities", effectiveDepartmentId], queryFn: () => api.get(`/api/master-data/specialities${effectiveDepartmentId ? `?departmentId=${effectiveDepartmentId}` : ""}`).then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/specialities", { name, departmentId: effectiveDepartmentId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["specialities"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/specialities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specialities"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("specialities")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          {scope.isHrAdmin ? (
            <select className="border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed whitespace-nowrap" disabled>
              <option>{scopedDepartmentName || t("your-department")}</option>
            </select>
          ) : (
            <select className="border rounded-md px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">{t("select-department")}</option>
              {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <Input placeholder={t("speciality-name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name || !effectiveDepartmentId}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{s.name}</span> <Badge variant="secondary" className="ms-2">{s.department?.name}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-specialities-yet")}</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="speciality" requiredColumns={["name", "departmentName"]} />
    </Card>
  );
}

function ClassGroupTab() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const effectiveDepartmentId = scope.isHrAdmin ? scope.departmentId! : "";

  const { data: levels } = useQuery<string[]>({
    queryKey: ["academic-levels"],
    queryFn: () => api.get("/api/master-data/levels").then((r) => r.data.data),
  });

  const { data: specialities } = useQuery({
    queryKey: ["specialities", effectiveDepartmentId],
    queryFn: () => api.get(`/api/master-data/specialities${effectiveDepartmentId ? `?departmentId=${effectiveDepartmentId}` : ""}`).then((r) => r.data.data),
  });
  const specialityIds = specialities?.map((s: any) => s.id) || [];
  const { data } = useQuery({
    queryKey: ["classGroups", effectiveDepartmentId],
    queryFn: () => api.get("/api/master-data/class-groups").then((r) => {
      if (scope.isHrAdmin && specialityIds.length > 0) {
        return r.data.data.filter((cg: any) => specialityIds.includes(cg.specialityId));
      }
      return r.data.data;
    }),
    enabled: !scope.isHrAdmin || specialityIds.length > 0,
  });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/class-groups", { name, level, specialityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classGroups"] }); setName(""); setLevel(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/class-groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classGroups"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("class-groups")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => setSpecialityId(e.target.value)}>
            <option value="">{t("select-speciality")}</option>
            {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input placeholder={t("group-name")} value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded-md px-3 py-2 text-sm w-24" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">{t("level")}</option>
            {(levels || []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button type="submit" disabled={!name || !level || !specialityId}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((cg: any) => (
            <div key={cg.id} className="flex items-center justify-between p-3">
              <div>
                <span className="font-medium">{cg.name}</span>
                <Badge variant="outline" className="ms-2">{cg.level}</Badge>
                <Badge variant="secondary" className="ms-2">{cg.speciality?.name}</Badge>
                {cg._count && <span className="ms-2 text-sm text-muted-foreground">{cg._count.students} {t("x-students")}, {cg._count.modules} {t("x-modules")}</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(cg.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-class-groups-yet")}</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="classGroup" requiredColumns={["name", "level", "specialityName"]} />
    </Card>
  );
}

function LevelTab() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [name, setName] = useState("");

  const { data: levels } = useQuery<string[]>({
    queryKey: ["academic-levels"],
    queryFn: () => api.get("/api/master-data/levels").then((r) => r.data.data),
  });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/levels", { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic-levels"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (levelName: string) => api.delete(`/api/master-data/levels/${encodeURIComponent(levelName)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academic-levels"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("academic-levels")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <Input placeholder={t("level-name")} value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
          <Button type="submit" disabled={!name.trim()}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
        </form>
        <div className="divide-y rounded-md border">
          {levels?.map((l) => (
            <div key={l} className="flex items-center justify-between p-3">
              <div><Badge variant="outline">{l}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(l)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(!levels || levels.length === 0) && <p className="p-4 text-center text-muted-foreground">{t("no-levels-defined")}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function RoomTab() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [universityId, setUniversityId] = useState(scope.universityId || "");
  const [csvOpen, setCsvOpen] = useState(false);

  const effectiveUniversityId = scope.isScoped ? scope.universityId! : universityId;

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });

  const scopedUniversityName = scope.isScoped && universities
    ? universities.find((u: any) => u.id === scope.universityId)?.name
    : null;

  const { data } = useQuery({ queryKey: ["rooms", effectiveUniversityId], queryFn: () => api.get(`/api/master-data/rooms${effectiveUniversityId ? `?universityId=${effectiveUniversityId}` : ""}`).then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/rooms", { name, building: building || undefined, universityId: effectiveUniversityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); setName(""); setBuilding(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("rooms")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="me-2 h-4 w-4" />{t("import-csv")}</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          {scope.isScoped ? (
            <select className="border rounded-md px-3 py-2 text-sm bg-muted text-muted-foreground cursor-not-allowed" disabled>
              <option>{scopedUniversityName || t("your-university")}</option>
            </select>
          ) : (
            <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
              <option value="">{t("select-university")}</option>
              {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <Input placeholder={t("room-name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={t("building-optional")} value={building} onChange={(e) => setBuilding(e.target.value)} className="w-40" />
          <Button type="submit" disabled={!name || !effectiveUniversityId}><Plus className="me-1 h-4 w-4" />{t("add")}</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{r.name}</span> {r.building && <Badge variant="secondary" className="ms-2">{r.building}</Badge>}</div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-rooms-yet")}</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="room" requiredColumns={["name", "universityCode", "building"]} />
    </Card>
  );
}
