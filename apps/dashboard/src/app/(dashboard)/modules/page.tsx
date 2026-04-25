"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, UserPlus, Clock, X } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ModulesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Cascading select state for create form
  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  // Module form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: modules } = useQuery({
    queryKey: ["modules"],
    queryFn: () => api.get("/api/modules").then((r) => r.data.data),
  });

  // Cascading data
  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: faculties } = useQuery({ queryKey: ["faculties", universityId], queryFn: () => api.get(`/api/master-data/faculties?universityId=${universityId}`).then((r) => r.data.data), enabled: !!universityId });
  const { data: departments } = useQuery({ queryKey: ["departments", facultyId], queryFn: () => api.get(`/api/master-data/departments?facultyId=${facultyId}`).then((r) => r.data.data), enabled: !!facultyId });
  const { data: specialities } = useQuery({ queryKey: ["specialities", departmentId], queryFn: () => api.get(`/api/master-data/specialities?departmentId=${departmentId}`).then((r) => r.data.data), enabled: !!departmentId });
  const { data: classGroups } = useQuery({ queryKey: ["classGroups", specialityId], queryFn: () => api.get(`/api/master-data/class-groups?specialityId=${specialityId}`).then((r) => r.data.data), enabled: !!specialityId });
  const { data: rooms } = useQuery({ queryKey: ["rooms", universityId], queryFn: () => api.get(`/api/master-data/rooms?universityId=${universityId}`).then((r) => r.data.data), enabled: !!universityId });

  const createModule = useMutation({
    mutationFn: () => api.post("/api/modules", { name, code, classGroupId, roomId: roomId || undefined, startDate, endDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      setShowCreate(false);
      setName(""); setCode(""); setRoomId(""); setStartDate(""); setEndDate("");
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
          <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
          <p className="text-muted-foreground">Manage modules, sessions, and professor assignments</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? <><X className="mr-2 h-4 w-4" />Cancel</> : <><Plus className="mr-2 h-4 w-4" />New Module</>}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle>Create Module</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createModule.mutate(); }} className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }}>
                  <option value="">University</option>
                  {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={!universityId}>
                  <option value="">Faculty</option>
                  {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); }} disabled={!facultyId}>
                  <option value="">Department</option>
                  {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); }} disabled={!departmentId}>
                  <option value="">Speciality</option>
                  {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} disabled={!specialityId}>
                  <option value="">Class/Group</option>
                  {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Module name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Module code" value={code} onChange={(e) => setCode(e.target.value)} />
                <Input type="date" placeholder="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input type="date" placeholder="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex gap-2 items-center">
                <select className="border rounded-md px-3 py-2 text-sm w-48" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="">Room (optional)</option>
                  {rooms?.map((r: any) => <option key={r.id} value={r.id}>{r.name}{r.building ? ` - ${r.building}` : ""}</option>)}
                </select>
                <Button type="submit" disabled={!name || !code || !classGroupId || !startDate || !endDate || createModule.isPending}>Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          <h2 className="font-semibold text-lg">Module List</h2>
          <div className="divide-y rounded-md border max-h-[60vh] overflow-auto">
            {modules?.map((m: any) => (
              <button
                key={m.id}
                className={`w-full text-left p-3 hover:bg-muted transition ${selectedModule === m.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedModule(m.id)}
              >
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-muted-foreground flex gap-2">
                  <Badge variant="outline">{m.code}</Badge>
                  <span>{m.classGroup?.name} ({m.classGroup?.speciality?.name})</span>
                </div>
              </button>
            ))}
            {modules?.length === 0 && <p className="p-4 text-center text-muted-foreground">No modules</p>}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <ModuleDetail module={selected} onDelete={() => deleteModule.mutate(selected.id)} />
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a module to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleDetail({ module: mod, onDelete }: { module: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const [showAddSession, setShowAddSession] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [showAssign, setShowAssign] = useState(false);
  const [profEmail, setProfEmail] = useState("");

  const addSession = useMutation({
    mutationFn: () => api.post(`/api/modules/${mod.id}/sessions`, { moduleId: mod.id, dayOfWeek, startTime, endTime }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modules"] }); setShowAddSession(false); },
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => api.delete(`/api/modules/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });

  const { data: users } = useQuery({
    queryKey: ["professors"],
    queryFn: () => api.get("/api/users?limit=100").then((r) => r.data.data),
    enabled: showAssign,
  });
  const professors = users?.filter((u: any) => u.role?.name === "PROFESSOR") || [];

  const assignProf = useMutation({
    mutationFn: (userId: string) => api.post(`/api/modules/${mod.id}/assign-professor`, { userId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["modules"] }); setShowAssign(false); setProfEmail(""); },
  });

  const removeProf = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/modules/${mod.id}/professors/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{mod.name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <Badge variant="outline">{mod.code}</Badge>
            {mod.room && <Badge variant="secondary" className="ml-2">{mod.room.name}</Badge>}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Class/Group:</span> {mod.classGroup?.name} ({mod.classGroup?.speciality?.name})</div>
          <div><span className="font-medium">Period:</span> {new Date(mod.startDate).toLocaleDateString()} - {new Date(mod.endDate).toLocaleDateString()}</div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Sessions</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddSession(!showAddSession)}>
              {showAddSession ? "Cancel" : <><Plus className="mr-1 h-3 w-3" />Add Session</>}
            </Button>
          </div>
          {showAddSession && (
            <form onSubmit={(e) => { e.preventDefault(); addSession.mutate(); }} className="flex gap-2 mb-3">
              <select className="border rounded-md px-3 py-1 text-sm" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-28" />
              <Button type="submit" size="sm">Add</Button>
            </form>
          )}
          <div className="space-y-1">
            {mod.sessions?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-md border">
                <span className="text-sm"><Badge variant="outline">{DAYS[s.dayOfWeek]}</Badge> {s.startTime} - {s.endTime}</span>
                <Button variant="ghost" size="icon" onClick={() => deleteSession.mutate(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            {(!mod.sessions || mod.sessions.length === 0) && <p className="text-sm text-muted-foreground">No sessions scheduled</p>}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" />Professors</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAssign(!showAssign)}>
              {showAssign ? "Cancel" : <><Plus className="mr-1 h-3 w-3" />Assign</>}
            </Button>
          </div>
          {showAssign && (
            <div className="mb-3">
              <select className="border rounded-md px-3 py-2 text-sm w-full" value={profEmail} onChange={(e) => { setProfEmail(e.target.value); if (e.target.value) assignProf.mutate(e.target.value); }}>
                <option value="">Select professor...</option>
                {professors.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            {mod.professors?.map((pm: any) => (
              <div key={pm.id} className="flex items-center justify-between p-2 rounded-md border">
                <span className="text-sm">{pm.user?.firstName} {pm.user?.lastName} <span className="text-muted-foreground">({pm.user?.email})</span></span>
                <Button variant="ghost" size="icon" onClick={() => removeProf.mutate(pm.userId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            {(!mod.professors || mod.professors.length === 0) && <p className="text-sm text-muted-foreground">No professors assigned</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
