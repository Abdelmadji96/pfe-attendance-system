"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ChevronRight, Camera, Upload, X, Loader2 } from "lucide-react";

const STEPS = [
  "RFID Scan",
  "Student Info",
  "Academic Info",
  "Face Enrollment",
  "Review & Submit",
];

export default function EnrollmentPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [rfidUid, setRfidUid] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");

  // Cascading selects
  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  // Face images
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cascading data
  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: faculties } = useQuery({ queryKey: ["faculties", universityId], queryFn: () => api.get(`/api/master-data/faculties?universityId=${universityId}`).then((r) => r.data.data), enabled: !!universityId });
  const { data: departments } = useQuery({ queryKey: ["departments", facultyId], queryFn: () => api.get(`/api/master-data/departments?facultyId=${facultyId}`).then((r) => r.data.data), enabled: !!facultyId });
  const { data: specialities } = useQuery({ queryKey: ["specialities", departmentId], queryFn: () => api.get(`/api/master-data/specialities?departmentId=${departmentId}`).then((r) => r.data.data), enabled: !!departmentId });
  const { data: classGroups } = useQuery({ queryKey: ["classGroups", specialityId], queryFn: () => api.get(`/api/master-data/class-groups?specialityId=${specialityId}`).then((r) => r.data.data), enabled: !!specialityId });

  const selectedClassGroup = classGroups?.find((cg: any) => cg.id === classGroupId);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create user
      const userRes = await api.post("/api/users", {
        firstName, lastName, email, phone, studentId, classGroupId, rfidUid,
      });
      const userId = userRes.data.data.id;

      // Upload face images
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("images", img));
        await api.post(`/api/face/${userId}/enroll`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      return userRes.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setStep(0);
      setRfidUid(""); setFirstName(""); setLastName(""); setEmail(""); setPhone("");
      setStudentId(""); setUniversityId(""); setFacultyId(""); setDepartmentId("");
      setSpecialityId(""); setClassGroupId(""); setImages([]); setPreviews([]);
      alert("Student enrolled successfully!");
    },
  });

  const handleFiles = useCallback((files: FileList) => {
    const newFiles = Array.from(files).slice(0, 20 - images.length);
    setImages((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, [images.length]);

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const canProceed = () => {
    switch (step) {
      case 0: return rfidUid.length > 0;
      case 1: return firstName && lastName && email && studentId;
      case 2: return classGroupId;
      case 3: return images.length >= 10;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Enrollment</h1>
        <p className="text-muted-foreground">Register a new student with RFID and face data</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              i < step ? "bg-green-100 text-green-800" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <CheckCircle className="h-4 w-4" /> : <span className="font-medium">{i + 1}</span>}
              <span>{s}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {step === 0 && (
            <div className="space-y-4 max-w-md">
              <Label>RFID Card UID</Label>
              <Input placeholder="Scan or enter RFID UID" value={rfidUid} onChange={(e) => setRfidUid(e.target.value)} autoFocus />
              <p className="text-sm text-muted-foreground">Tap the RFID card on the reader or enter the UID manually.</p>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2"><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>Student ID</Label><Input value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">Select the academic structure. Modules will be assigned automatically from the class group.</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label>University</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={universityId} onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }}>
                    <option value="">Select University</option>
                    {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Faculty</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={!universityId}>
                    <option value="">Select Faculty</option>
                    {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); }} disabled={!facultyId}>
                    <option value="">Select Department</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Speciality</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); }} disabled={!departmentId}>
                    <option value="">Select Speciality</option>
                    {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Class / Group</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} disabled={!specialityId}>
                    <option value="">Select Class/Group</option>
                    {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />Upload Images
                </Button>
                <Badge variant={images.length >= 10 ? "default" : "destructive"}>{images.length}/10-20 images</Badge>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5" onClick={() => removeImage(i)}>
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              {images.length < 10 && <p className="text-sm text-destructive">At least 10 face images required</p>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 max-w-xl">
              <h3 className="font-semibold text-lg">Review</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">RFID UID:</span> {rfidUid}</div>
                <div><span className="font-medium">Student ID:</span> {studentId}</div>
                <div><span className="font-medium">Name:</span> {firstName} {lastName}</div>
                <div><span className="font-medium">Email:</span> {email}</div>
                <div><span className="font-medium">Phone:</span> {phone || "N/A"}</div>
                <div><span className="font-medium">Class:</span> {selectedClassGroup?.name} ({selectedClassGroup?.level})</div>
                <div><span className="font-medium">Face Images:</span> {images.length}</div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enroll Student
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
