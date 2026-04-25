"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload } from "lucide-react";
import CsvImportDialog from "@/components/csv-import-dialog";

type Entity = "universities" | "faculties" | "departments" | "specialities" | "class-groups" | "rooms";

export default function MasterDataPage() {
  const [tab, setTab] = useState<Entity>("universities");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Data</h1>
          <p className="text-muted-foreground">Manage academic hierarchy and rooms</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Entity)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="universities">Universities</TabsTrigger>
          <TabsTrigger value="faculties">Faculties</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="specialities">Specialities</TabsTrigger>
          <TabsTrigger value="class-groups">Classes</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
        </TabsList>

        <TabsContent value="universities"><UniversityTab /></TabsContent>
        <TabsContent value="faculties"><FacultyTab /></TabsContent>
        <TabsContent value="departments"><DepartmentTab /></TabsContent>
        <TabsContent value="specialities"><SpecialityTab /></TabsContent>
        <TabsContent value="class-groups"><ClassGroupTab /></TabsContent>
        <TabsContent value="rooms"><RoomTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UniversityTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/universities", { name, code }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); setName(""); setCode(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/universities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["universities"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Universities</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" />
          <Button type="submit" disabled={!name || !code}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{u.name}</span> <Badge variant="outline" className="ml-2">{u.code}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No universities yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="university" requiredColumns={["name", "code"]} />
    </Card>
  );
}

function FacultyTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data } = useQuery({ queryKey: ["faculties"], queryFn: () => api.get("/api/master-data/faculties").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/faculties", { name, universityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculties"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/faculties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faculties"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Faculties</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
            <option value="">Select University</option>
            {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Input placeholder="Faculty name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name || !universityId}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{f.name}</span> <Badge variant="secondary" className="ml-2">{f.university?.name}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No faculties yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="faculty" requiredColumns={["name", "universityCode"]} />
    </Card>
  );
}

function DepartmentTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: faculties } = useQuery({ queryKey: ["faculties"], queryFn: () => api.get("/api/master-data/faculties").then((r) => r.data.data) });
  const { data } = useQuery({ queryKey: ["departments"], queryFn: () => api.get("/api/master-data/departments").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/departments", { name, facultyId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Departments</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">Select Faculty</option>
            {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Input placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name || !facultyId}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{d.name}</span> <Badge variant="secondary" className="ml-2">{d.faculty?.name}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No departments yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="department" requiredColumns={["name", "facultyName", "universityCode"]} />
    </Card>
  );
}

function SpecialityTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => api.get("/api/master-data/departments").then((r) => r.data.data) });
  const { data } = useQuery({ queryKey: ["specialities"], queryFn: () => api.get("/api/master-data/specialities").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/specialities", { name, departmentId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["specialities"] }); setName(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/specialities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["specialities"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Specialities</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select Department</option>
            {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Input placeholder="Speciality name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={!name || !departmentId}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{s.name}</span> <Badge variant="secondary" className="ml-2">{s.department?.name}</Badge></div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No specialities yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="speciality" requiredColumns={["name", "departmentName"]} />
    </Card>
  );
}

function ClassGroupTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: specialities } = useQuery({ queryKey: ["specialities"], queryFn: () => api.get("/api/master-data/specialities").then((r) => r.data.data) });
  const { data } = useQuery({ queryKey: ["classGroups"], queryFn: () => api.get("/api/master-data/class-groups").then((r) => r.data.data) });
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
        <CardTitle>Class Groups</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => setSpecialityId(e.target.value)}>
            <option value="">Select Speciality</option>
            {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded-md px-3 py-2 text-sm w-24" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Level</option>
            {["L1", "L2", "L3", "M1", "M2"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button type="submit" disabled={!name || !level || !specialityId}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((cg: any) => (
            <div key={cg.id} className="flex items-center justify-between p-3">
              <div>
                <span className="font-medium">{cg.name}</span>
                <Badge variant="outline" className="ml-2">{cg.level}</Badge>
                <Badge variant="secondary" className="ml-2">{cg.speciality?.name}</Badge>
                {cg._count && <span className="ml-2 text-sm text-muted-foreground">{cg._count.students} students, {cg._count.modules} modules</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(cg.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No class groups yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="classGroup" requiredColumns={["name", "level", "specialityName"]} />
    </Card>
  );
}

function RoomTab() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data } = useQuery({ queryKey: ["rooms"], queryFn: () => api.get("/api/master-data/rooms").then((r) => r.data.data) });
  const create = useMutation({
    mutationFn: () => api.post("/api/master-data/rooms", { name, building: building || undefined, universityId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rooms"] }); setName(""); setBuilding(""); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/api/master-data/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Rooms</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
            <option value="">Select University</option>
            {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Input placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Building (optional)" value={building} onChange={(e) => setBuilding(e.target.value)} className="w-40" />
          <Button type="submit" disabled={!name || !universityId}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </form>
        <div className="divide-y rounded-md border">
          {data?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div><span className="font-medium">{r.name}</span> {r.building && <Badge variant="secondary" className="ml-2">{r.building}</Badge>}</div>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {data?.length === 0 && <p className="p-4 text-center text-muted-foreground">No rooms yet</p>}
        </div>
      </CardContent>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} entityType="room" requiredColumns={["name", "universityCode", "building"]} />
    </Card>
  );
}
