"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users } from "lucide-react";

interface RoleWithCount {
  id: string;
  name: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

export default function RolesPage() {
  const { data: roles, isLoading } = useQuery<RoleWithCount[]>({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/api/roles")).data.data,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground">
          View and manage system roles and permissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary" />
                {role.name.replace(/_/g, " ")}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {role.userCount} users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {(role.permissions as string[]).map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
