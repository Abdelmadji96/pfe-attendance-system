"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api, { API_ORIGIN } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, GraduationCap, CreditCard, ScanFace, BookOpen } from "lucide-react";

export default function UserDetailPage() {
  const { id } = useParams();
  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: () => api.get(`/api/users/${id}`).then((r) => r.data.data),
  });

  const { data: faceTemplates, isLoading: faceTemplatesLoading } = useQuery({
    queryKey: ["face-templates", id],
    queryFn: () => api.get(`/api/face/templates/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: classModules } = useQuery({
    queryKey: ["modules", user?.classGroupId],
    queryFn: () =>
      api
        .get(`/api/modules?classGroupId=${user!.classGroupId}`)
        .then((r) => r.data.data),
    enabled: !!user?.classGroupId,
  });

  const faceImageUrl = (imagePath: string) =>
    `${API_ORIGIN}/${imagePath.replace(/^\//, "")}`;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <div className="p-8 text-center text-muted-foreground">User not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.firstName} {user.lastName}</h1>
        <p className="text-muted-foreground">{user.email || "No email"}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Name" value={`${user.firstName} ${user.lastName}`} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone || "N/A"} />
            <InfoRow label="Role" value={<Badge>{user.role?.name}</Badge>} />
            <InfoRow label="Status" value={<Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>} />
            <InfoRow label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Academic Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {user.classGroup ? (
              <>
                {user.studentId && <InfoRow label="Student ID" value={user.studentId} />}
                <InfoRow label="Class / Group" value={`${user.classGroup.name} (${user.classGroup.level})`} />
                <InfoRow label="Speciality" value={user.classGroup.speciality?.name || "N/A"} />
                <InfoRow label="Department" value={user.classGroup.speciality?.department?.name || "N/A"} />
                <InfoRow label="Faculty" value={user.classGroup.speciality?.department?.faculty?.name || "N/A"} />
                <InfoRow label="University" value={user.classGroup.speciality?.department?.faculty?.university?.name || "N/A"} />
                <Separator />
                <p className="text-sm font-medium">Class modules:</p>
                {classModules?.length > 0 ? (
                  <div className="space-y-1">
                    {classModules.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {m.name}{" "}
                          <Badge variant="outline" className="ml-1">{m.code}</Badge>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No modules for this class group yet</p>
                )}
              </>
            ) : user.professorModules?.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Assigned Modules:</p>
                <div className="space-y-1">
                  {user.professorModules.map((pm: any) => (
                    <div key={pm.id} className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{pm.module?.name} <Badge variant="outline" className="ml-1">{pm.module?.code}</Badge></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No academic information</p>
            )}
          </CardContent>
        </Card>

        {/* RFID Card */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />RFID Card</CardTitle></CardHeader>
          <CardContent>
            {user.rfidCard ? (
              <div className="space-y-2">
                <InfoRow label="UID" value={user.rfidCard.uid} />
                <InfoRow label="Status" value={<Badge variant={user.rfidCard.isActive ? "default" : "secondary"}>{user.rfidCard.isActive ? "Active" : "Inactive"}</Badge>} />
                <InfoRow label="Assigned" value={new Date(user.rfidCard.assignedAt).toLocaleDateString()} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No RFID card assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Face Templates */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ScanFace className="h-5 w-5" />Face Templates</CardTitle></CardHeader>
          <CardContent>
            {faceTemplatesLoading ? (
              <p className="text-sm text-muted-foreground">Loading face templates...</p>
            ) : faceTemplates?.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm">{faceTemplates.length} face templates enrolled</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {faceTemplates.map((t: any) => (
                    <div key={t.id} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                      <img
                        src={faceImageUrl(t.imagePath)}
                        alt="Face template"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 end-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {(t.qualityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No face templates enrolled</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
