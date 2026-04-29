"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Webcam from "react-webcam";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ChevronRight, Camera, Upload, X, Loader2 } from "lucide-react";
import { useUserScope } from "@/hooks/use-scope";

function dataURLtoFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export default function EnrollmentPage() {
  const qc = useQueryClient();
  const scope = useUserScope();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [rfidUid, setRfidUid] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");

  const [universityId, setUniversityId] = useState(scope.universityId || "");
  const [facultyId, setFacultyId] = useState(scope.facultyId || "");
  const [departmentId, setDepartmentId] = useState(scope.departmentId || "");
  const [specialityId, setSpecialityId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const effectiveUniversityId = scope.isScoped ? scope.universityId! : universityId;
  const effectiveFacultyId = scope.isHrAdmin ? scope.facultyId! : facultyId;
  const effectiveDepartmentId = scope.isHrAdmin ? scope.departmentId! : departmentId;

  const { data: universities } = useQuery({ queryKey: ["universities"], queryFn: () => api.get("/api/master-data/universities").then((r) => r.data.data) });
  const { data: faculties } = useQuery({ queryKey: ["faculties", effectiveUniversityId], queryFn: () => api.get(`/api/master-data/faculties?universityId=${effectiveUniversityId}`).then((r) => r.data.data), enabled: !!effectiveUniversityId });
  const { data: departments } = useQuery({ queryKey: ["departments", effectiveFacultyId], queryFn: () => api.get(`/api/master-data/departments?facultyId=${effectiveFacultyId}`).then((r) => r.data.data), enabled: !!effectiveFacultyId });
  const { data: specialities } = useQuery({ queryKey: ["specialities", effectiveDepartmentId], queryFn: () => api.get(`/api/master-data/specialities?departmentId=${effectiveDepartmentId}`).then((r) => r.data.data), enabled: !!effectiveDepartmentId });
  const { data: classGroups } = useQuery({ queryKey: ["classGroups", specialityId], queryFn: () => api.get(`/api/master-data/class-groups?specialityId=${specialityId}`).then((r) => r.data.data), enabled: !!specialityId });

  const selectedClassGroup = classGroups?.find((cg: any) => cg.id === classGroupId);

  const STEPS = [
    t("rfid-scan"),
    t("user-info"),
    t("academic-info"),
    t("face-enrollment"),
    t("review-submit"),
  ];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const userRes = await api.post("/api/users", {
        firstName, lastName, email, phone, studentId, classGroupId, rfidUid,
      });
      const userId = userRes.data.data.id;

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("images", img));
        await api.post(`/api/face/enroll/${userId}`, formData, {
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
      setCameraActive(false);
      alert(t("enrollment-success"));
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

  const captureFromCamera = useCallback(() => {
    if (!webcamRef.current || images.length >= 20) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) return;
    const file = dataURLtoFile(screenshot, `capture-${Date.now()}.jpg`);
    setImages((prev) => [...prev, file]);
    setPreviews((prev) => [...prev, screenshot]);
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
        <h1 className="text-3xl font-bold tracking-tight">{t("enrollment-registration")}</h1>
        <p className="text-muted-foreground">{t("register-new-user")}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
              <Label>{t("rfid-card-uid")}</Label>
              <Input placeholder={t("scan-enter-rfid")} value={rfidUid} onChange={(e) => setRfidUid(e.target.value)} autoFocus />
              <p className="text-sm text-muted-foreground">{t("tap-rfid-card")}</p>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2"><Label>{t("first-name")}</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("last-name")}</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>{t("student-id")}</Label><Input value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground">{t("select-academic-structure")}</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label>{t("university")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={effectiveUniversityId} onChange={(e) => { setUniversityId(e.target.value); setFacultyId(""); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isScoped}>
                    <option value="">{t("select-university")}</option>
                    {universities?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("faculty")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={effectiveFacultyId} onChange={(e) => { setFacultyId(e.target.value); setDepartmentId(""); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isHrAdmin || !effectiveUniversityId}>
                    <option value="">{t("select-faculty")}</option>
                    {faculties?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("department")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={effectiveDepartmentId} onChange={(e) => { setDepartmentId(e.target.value); setSpecialityId(""); setClassGroupId(""); }} disabled={scope.isHrAdmin || !effectiveFacultyId}>
                    <option value="">{t("select-department")}</option>
                    {departments?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("speciality-major")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setClassGroupId(""); }} disabled={!effectiveDepartmentId}>
                    <option value="">{t("select-speciality")}</option>
                    {specialities?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{t("class-group")}</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={classGroupId} onChange={(e) => setClassGroupId(e.target.value)} disabled={!specialityId}>
                    <option value="">{t("select-class-group")}</option>
                    {classGroups?.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={images.length >= 20}>
                  <Upload className="me-2 h-4 w-4" />{t("upload-images")}
                </Button>
                <Button
                  variant={cameraActive ? "default" : "outline"}
                  onClick={() => setCameraActive(!cameraActive)}
                >
                  <Camera className="me-2 h-4 w-4" />{cameraActive ? t("close-camera") : t("capture-camera")}
                </Button>
                <Badge variant={images.length >= 10 ? "default" : "destructive"}>{images.length}/10-20 {t("images-count")}</Badge>
              </div>

              {cameraActive && (
                <div className="space-y-3">
                  <div className="relative w-full max-w-md rounded-lg overflow-hidden border">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user", width: 480, height: 360 }}
                      className="w-full"
                    />
                  </div>
                  <Button onClick={captureFromCamera} disabled={images.length >= 20}>
                    <Camera className="me-2 h-4 w-4" />{t("capture-snapshot")} ({images.length}/20)
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button className="absolute top-1 end-1 bg-black/50 rounded-full p-0.5" onClick={() => removeImage(i)}>
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              {images.length < 10 && <p className="text-sm text-destructive">{t("at-least-10-images")}</p>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 max-w-xl">
              <h3 className="font-semibold text-lg">{t("review")}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">{t("rfid-uid")}:</span> {rfidUid}</div>
                <div><span className="font-medium">{t("student-id")}:</span> {studentId}</div>
                <div><span className="font-medium">{t("name")}:</span> {firstName} {lastName}</div>
                <div><span className="font-medium">{t("email")}:</span> {email}</div>
                <div><span className="font-medium">{t("phone")}:</span> {phone || t("n-a")}</div>
                <div><span className="font-medium">{t("class")}:</span> {selectedClassGroup?.name} ({selectedClassGroup?.level})</div>
                <div><span className="font-medium">{t("face-images")}:</span> {images.length}</div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{t("back")}</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>{t("next")} <ChevronRight className="ms-1 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                {t("enroll-user")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
