"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Settings as SettingsIcon } from "lucide-react";
import type { SettingDto } from "@pfe/shared";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery<SettingDto[]>({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/api/settings")).data.data,
    onSuccess: (data: SettingDto[]) => {
      const vals: Record<string, string> = {};
      data.forEach((s) => (vals[s.key] = s.value));
      setEditedValues(vals);
    },
  } as any);

  const mutation = useMutation({
    mutationFn: async () => {
      const settingsArray = Object.entries(editedValues).map(([key, value]) => ({
        key,
        value,
      }));
      return api.patch("/api/settings", { settings: settingsArray });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const settingLabels: Record<string, string> = {
    similarity_threshold: "Similarity Threshold",
    embedding_dimension: "Embedding Dimension",
    min_face_images: "Minimum Face Images",
    max_face_images: "Maximum Face Images",
    max_file_size_mb: "Max File Size (MB)",
    session_timeout_minutes: "Session Timeout (minutes)",
    door_unlock_duration_seconds: "Door Unlock Duration (seconds)",
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system parameters</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" /> System Configuration
          </CardTitle>
          <CardDescription>
            Adjust verification thresholds, file limits, and hardware timing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.map((setting) => (
            <div key={setting.key} className="grid grid-cols-2 gap-4 items-center">
              <Label>{settingLabels[setting.key] || setting.key}</Label>
              <Input
                value={editedValues[setting.key] || ""}
                onChange={(e) =>
                  setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                }
              />
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
