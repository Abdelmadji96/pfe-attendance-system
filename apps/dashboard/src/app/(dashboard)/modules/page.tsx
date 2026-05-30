"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, UserPlus, Clock, X, Pencil, Save } from "lucide-react";
import { useUserScope } from "@/hooks/use-scope";
import { toastSuccess } from "@/hooks/use-toast";

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDisplayDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return new Date(value).toLocaleDateString();
}

export default function ModulesPage() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const [universityId, setUniversityId] = useState(scope.universityId || "");
  const [facultyId, setFacultyId] = useState(scope.facultyId || "");
  const [departmentId, setDepartmentId] = useState(scope.departmentId || "");
  const [specialityId, setSpecialityId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const { data: modules } = useQuery({
    queryKey: ["modules"],
    queryFn: () => api.get("/api/modules").then((r) => r.data.data),
  });

  const effectiveUniversityId = scope.isScoped ? scope.universityId! : universityId;
  const effectiveFacultyId = scope.isHrAdmin ? scope.facultyId! : facultyId;
  const effectiveDepartmentId = scope.isHrAdmin ? scope.departmentId! : departmentId;

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: faculties } = useQuery({ queryKey: ["faculties", effectiveUniversityId], queryFn: () => api.get(`/api/master-data/faculties?universityId=${effectiveUniversityId}`).then((r) => r.data.data), enabled: !!effectiveUniversityId });
  const { data: departments } = useQuery({ queryKey: ["departments", effectiveFacultyId], queryFn: () => api.get(`/api/master-data/departments?facultyId=${effectiveFacultyId}`).then((r) => r.data.data), enabled: !!effectiveFacultyId });
  const { data: specialities } = useQuery({ queryKey: ["specialities", effectiveDepartmentId], queryFn: () => api.get(`/api/master-data/specialities?departmentId=${effectiveDepartmentId}`).then((r) => r.data.data), enabled: !!effectiveDepartmentId });
  const { data: classGroups } = useQuery({ queryKey: ["classGroups", specialityId], queryFn: () => api.get(`/api/master-data/class-groups?specialityId=${specialityId}`).then((r) => r.data.data), enabled: !!specialityId });
  const { data: rooms } = useQuery({ queryKey: ["rooms", effectiveUniversityId], queryFn: () => api.get(`/api/master-data/rooms?universityId=${effectiveUniversityId}`).then((r) => r.data.data), enabled: !!effectiveUniversityId });

  const createModule = useMutation({
    mutationFn: () => api.post("/api/modules", { name, classGroupId, roomId: roomId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setShowCreate(false);
      setName(""); setRoomId("");
    },
  });

  const deleteModule = useMutation({
    mutationFn: (id: string) => api.delete(`/api/modules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modules"] }); setSelectedModule(null); },
  });

  const selected = modules?.find((m: any) => m.id === selectedModule);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("modules")}</h1>
          <p className="text-muted-foreground">{t("manage-modules")}</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <><X className="me-2 h-4 w-4" />{t("cancel")}</> : <><Plus className="me-2 h-4 w-4" />{t("new-module")}</>}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>{t("create-module")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createModule.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                <select className="border rounded-md px-3 py-2 text-sm" value={effectiveUniversityId} onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isScoped}>
                  <option value="">{t("university")}</option>
                  {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={effectiveFacultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isHrAdmin || !effectiveUniversityId}>
                  <option value="">{t("faculty")}</option>
                  {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={effectiveDepartmentId} onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isHrAdmin || !effectiveFacultyId}>
                  <option value="">{t("department")}</option>
                  {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); }} disabled={!effectiveDepartmentId}>
                  <option value="">{t("speciality")}</option>
                  {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} disabled={!specialityId}>
                  <option value="">{t("class-group")}</option>
                  {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>)}
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <Input placeholder={t("module-name")} value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
                <select className="border rounded-md px-3 py-2 text-sm w-48" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="">{t("room-optional")}</option>
                  {rooms?.map((r: any) => <option key={r.id} value={r.id}>{r.name}{r.building ? ` - ${r.building}` : ""}</option>)}
                </select>
                <Button type="submit" disabled={!name || !classGroupId || createModule.isPending}>{t("create")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <h2 className="font-semibold text-lg">{t("module-list")}</h2>
          <div className="divide-y rounded-md border max-h-[60vh] overflow-auto">
            {modules?.map((m: any) => (
              <button
                key={m.id}
                className={`w-full text-start p-3 hover:bg-muted transition ${selectedModule === m.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedModule(m.id)}
              >
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-muted-foreground flex gap-2">
                  {m.code && <Badge variant="outline">{m.code}</Badge>}
                  <span>{m.classGroup?.name} ({m.classGroup?.speciality?.name})</span>
                </div>
              </button>
            ))}
            {modules?.length === 0 && <p className="p-4 text-center text-muted-foreground">{t("no-modules")}</p>}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <ModuleDetail module={selected} onDelete={() => deleteModule.mutate(selected.id)} />
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{t("select-module-details")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleDetail({ module: mod, onDelete }: { module: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const DAYS = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(mod.name);
  const [editCode, setEditCode] = useState(mod.code || "");
  const [editRoomId, setEditRoomId] = useState(mod.roomId || "");
  const [editStartDate, setEditStartDate] = useState(toDateInputValue(mod.startDate));
  const [editEndDate, setEditEndDate] = useState(toDateInputValue(mod.endDate));

  const [showAddSession, setShowAddSession] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionDay, setEditSessionDay] = useState(1);
  const [editSessionStart, setEditSessionStart] = useState("08:00");
  const [editSessionEnd, setEditSessionEnd] = useState("09:30");

  const [showAssign, setShowAssign] = useState(false);
  const [selectedProfId, setSelectedProfId] = useState("");

  const cg = mod.classGroup;
  const spec = cg?.speciality;
  const dept = spec?.department;
  const fac = dept?.faculty;
  const uni = fac?.university;
  const universityId = uni?.id || fac?.universityId;

  const { data: rooms } = useQuery({
    queryKey: ["rooms", universityId],
    queryFn: () => api.get(`/api/master-data/rooms?universityId=${universityId}`).then((r) => r.data.data),
    enabled: !!universityId && (isEditing || showAddSession),
  });

  const updateModule = useMutation({
    mutationFn: () =>
      api.patch(`/api/modules/${mod.id}`, {
        name: editName,
        code: editCode || undefined,
        roomId: editRoomId || null,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setIsEditing(false);
      toastSuccess(t("module-updated"));
    },
  });

  const addSession = useMutation({
    mutationFn: () => api.post(`/api/modules/${mod.id}/sessions`, { moduleId: mod.id, dayOfWeek, startTime, endTime }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setShowAddSession(false);
      toastSuccess(t("session-updated"));
    },
  });

  const updateSession = useMutation({
    mutationFn: (sessionId: string) =>
      api.patch(`/api/modules/sessions/${sessionId}`, {
        dayOfWeek: editSessionDay,
        startTime: editSessionStart,
        endTime: editSessionEnd,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setEditingSessionId(null);
      toastSuccess(t("session-updated"));
    },
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => api.delete(`/api/modules/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });

  const { data: staffResult } = useQuery({
    queryKey: ["professors-for-assign"],
    queryFn: () => api.get("/api/staff?limit=100&role=PROFESSOR").then((r) => r.data),
    enabled: showAssign,
  });
  const professors = staffResult?.data || [];
  const assignedIds = new Set((mod.professors || []).map((pm: any) => pm.userId));

  const assignProf = useMutation({
    mutationFn: (userId: string) => api.post(`/api/modules/${mod.id}/assign-professor`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setShowAssign(false);
      setSelectedProfId("");
      toastSuccess(t("professor-assigned"));
    },
  });

  const removeProf = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/modules/${mod.id}/professors/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      toastSuccess(t("professor-removed"));
    },
  });

  const startEditModule = () => {
    setEditName(mod.name);
    setEditCode(mod.code || "");
    setEditRoomId(mod.roomId || "");
    setEditStartDate(toDateInputValue(mod.startDate));
    setEditEndDate(toDateInputValue(mod.endDate));
    setIsEditing(true);
  };

  const startEditSession = (session: any) => {
    setEditingSessionId(session.id);
    setEditSessionDay(session.dayOfWeek);
    setEditSessionStart(session.startTime);
    setEditSessionEnd(session.endTime);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{mod.name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
            <Badge variant="outline">{mod.code}</Badge>
            {mod.room && <Badge variant="secondary">{mod.room.name}</Badge>}
            <Badge variant="outline">{t("x-sessions-count").replace("{count}", String(mod.sessions?.length || 0))}</Badge>
            <Badge variant="outline">{t("x-professors-count").replace("{count}", String(mod.professors?.length || 0))}</Badge>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditModule}>
              <Pencil className="me-1 h-4 w-4" />{t("edit-module")}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="me-1 h-4 w-4" />{t("delete")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <form
            onSubmit={(e) => { e.preventDefault(); updateModule.mutate(); }}
            className="space-y-3 rounded-md border p-4 bg-muted/30"
          >
            <h3 className="font-semibold">{t("edit-module")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("module-name")}</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">{t("module-code")}</label>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("room")}</label>
                <select
                  className="border rounded-md px-3 py-2 text-sm w-full"
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                >
                  <option value="">{t("room-optional")}</option>
                  {rooms?.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.building ? ` — ${r.building}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">{t("start-date")}</label>
                  <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("end-date")}</label>
                  <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!editName || updateModule.isPending}>
                <Save className="me-1 h-4 w-4" />{t("save")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("module-details")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="font-medium">{t("module-code")}:</span> {mod.code || t("n-a")}</div>
              <div><span className="font-medium">{t("class-group")}:</span> {cg?.name} ({cg?.level})</div>
              <div><span className="font-medium">{t("speciality")}:</span> {spec?.name || t("n-a")}</div>
              <div><span className="font-medium">{t("department")}:</span> {dept?.name || t("n-a")}</div>
              <div><span className="font-medium">{t("faculty")}:</span> {fac?.name || t("n-a")}</div>
              <div><span className="font-medium">{t("university")}:</span> {uni?.name || t("n-a")}</div>
              <div><span className="font-medium">{t("room")}:</span> {mod.room?.name || t("n-a")}</div>
              <div><span className="font-medium">{t("building")}:</span> {mod.room?.building || t("n-a")}</div>
              <div>
                <span className="font-medium">{t("period")}:</span>{" "}
                {formatDisplayDate(mod.startDate, t("n-a"))} — {formatDisplayDate(mod.endDate, t("n-a"))}
              </div>
              <div><span className="font-medium">{t("academic-path")}:</span> {uni?.name} → {fac?.name} → {dept?.name} → {spec?.name} → {cg?.name}</div>
            </div>
          </div>
        )}

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />{t("sessions")}</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddSession(!showAddSession)}>
              {showAddSession ? t("cancel") : <><Plus className="me-1 h-3 w-3" />{t("add-session")}</>}
            </Button>
          </div>
          {showAddSession && (
            <form onSubmit={(e) => { e.preventDefault(); addSession.mutate(); }} className="flex flex-wrap gap-2 mb-3 p-3 rounded-md border bg-muted/20">
              <select className="border rounded-md px-3 py-1 text-sm" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-28" />
              <Button type="submit" size="sm" disabled={addSession.isPending}>{t("add")}</Button>
            </form>
          )}
          <div className="space-y-1">
            {mod.sessions?.map((s: any) => (
              editingSessionId === s.id ? (
                <form
                  key={s.id}
                  onSubmit={(e) => { e.preventDefault(); updateSession.mutate(s.id); }}
                  className="flex flex-wrap items-center gap-2 p-2 rounded-md border bg-muted/20"
                >
                  <select className="border rounded-md px-2 py-1 text-sm" value={editSessionDay} onChange={(e) => setEditSessionDay(Number(e.target.value))}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <Input type="time" value={editSessionStart} onChange={(e) => setEditSessionStart(e.target.value)} className="w-28 h-8" />
                  <Input type="time" value={editSessionEnd} onChange={(e) => setEditSessionEnd(e.target.value)} className="w-28 h-8" />
                  <Button type="submit" size="sm" disabled={updateSession.isPending}>{t("save")}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSessionId(null)}>{t("cancel")}</Button>
                </form>
              ) : (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md border">
                  <span className="text-sm">
                    <Badge variant="outline">{DAYS[s.dayOfWeek]}</Badge>{" "}
                    {s.startTime} — {s.endTime}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEditSession(s)} title={t("edit-session")}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSession.mutate(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            ))}
            {(!mod.sessions || mod.sessions.length === 0) && <p className="text-sm text-muted-foreground">{t("no-sessions")}</p>}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" />{t("professors")}</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAssign(!showAssign)}>
              {showAssign ? t("cancel") : <><Plus className="me-1 h-3 w-3" />{t("assign")}</>}
            </Button>
          </div>
          {showAssign && (
            <div className="flex gap-2 mb-3 p-3 rounded-md border bg-muted/20">
              <select
                className="border rounded-md px-3 py-2 text-sm flex-1"
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
              >
                <option value="">{t("select-professor")}</option>
                {professors
                  .filter((p: any) => !assignedIds.has(p.id))
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>
                  ))}
              </select>
              <Button
                size="sm"
                disabled={!selectedProfId || assignProf.isPending}
                onClick={() => assignProf.mutate(selectedProfId)}
              >
                {t("assign")}
              </Button>
            </div>
          )}
          <div className="space-y-1">
            {mod.professors?.map((pm: any) => (
              <div key={pm.id} className="flex items-center justify-between p-2 rounded-md border">
                <div className="text-sm">
                  <span className="font-medium">{pm.user?.firstName} {pm.user?.lastName}</span>
                  <span className="text-muted-foreground"> ({pm.user?.email})</span>
                  {pm.user?.phone && <span className="text-muted-foreground"> · {pm.user.phone}</span>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeProf.mutate(pm.userId)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            {(!mod.professors || mod.professors.length === 0) && <p className="text-sm text-muted-foreground">{t("no-professors")}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
