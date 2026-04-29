"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import api, { API_ORIGIN } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Camera, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, type Language } from "@/lib/i18n";

const LANGUAGE_OPTIONS: { value: Language; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "fr", label: "French", native: "Fran\u00e7ais" },
  { value: "ar", label: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
];

export default function SettingsPage() {
  const { user, login, token } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMutation = useMutation({
    mutationFn: () => api.patch("/api/auth/profile", { firstName, lastName, email, phone: phone || undefined }),
    onSuccess: (res) => {
      const updatedUser = res.data.data;
      if (token) login(updatedUser, token);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return api.post("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (res) => {
      const updatedUser = res.data.data.user;
      if (token) login(updatedUser, token);
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
  };

  const avatarSrc = user?.avatarUrl ? `${API_ORIGIN}${user.avatarUrl}` : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings")}</h1>
        <p className="text-muted-foreground">{t("manage-profile")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> {t("avatar")}
          </CardTitle>
          <CardDescription>{t("upload-change-avatar")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
            >
              {avatarMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="me-2 h-4 w-4" />
              )}
              {t("change-avatar")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("avatar-hint")}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> {t("profile")}
          </CardTitle>
          <CardDescription>{t("update-personal-info")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("first-name")}</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("last-name")}</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("phone")}</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("optional")} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => profileMutation.mutate()}
              disabled={profileMutation.isPending || !firstName || !lastName || !email}
            >
              {profileMutation.isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-2 h-4 w-4" />
              )}
              {t("save")}
            </Button>
            {profileSuccess && (
              <span className="text-sm text-green-600 font-medium">{t("profile-updated")}</span>
            )}
            {profileMutation.isError && (
              <span className="text-sm text-destructive font-medium">
                {(profileMutation.error as any)?.response?.data?.message || t("failed-update")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> {t("language")}
          </CardTitle>
          <CardDescription>{t("choose-language")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                className={`rounded-lg border-2 p-4 text-center transition-all ${
                  language === opt.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold text-sm">{opt.native}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.label}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
