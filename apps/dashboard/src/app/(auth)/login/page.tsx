"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@pfe/shared";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@university.edu", password: "admin123" },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setError("");
      const res = await api.post("/api/auth/login", data);
      login(res.data.data.user, res.data.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || t("login-failed"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-biskra-secondary via-biskra-secondary to-biskra-primary" />
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-biskra-primary/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-biskra-gold/10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-white/95 shadow-2xl shadow-black/20 mb-5 overflow-hidden">
            <Image
              src="/images/unigate-logo.png"
              alt="UniGate"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>
          <h2 className="text-white text-4xl font-extrabold tracking-wide drop-shadow-lg">
            UniGate
          </h2>
          <p className="text-white/80 text-base mt-2 font-medium drop-shadow-md">
            {t("university-attendance-system")}
          </p>
        </div>

        <Card className="border-0 shadow-2xl shadow-black/30 bg-white/95 backdrop-blur-md animate-fade-in">
          <CardHeader className="space-y-2 text-center pb-2 pt-8">
            <h1 className="text-2xl font-bold tracking-tight text-biskra-secondary">
              {t("sign-in")}
            </h1>
            <CardDescription className="text-base text-muted-foreground">
              {t("rfid-face-attendance")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@university.edu"
                  className="h-12 border-border/60 focus:border-biskra-primary focus:ring-biskra-primary/20"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium">{t("password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("enter-password")}
                    className="h-12 border-border/60 pe-11 focus:border-biskra-primary focus:ring-biskra-primary/20"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-12 w-11 shrink-0 text-muted-foreground hover:text-biskra-secondary"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg shadow-biskra-primary/25"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("signing-in")}
                  </span>
                ) : (
                  t("sign-in")
                )}
              </Button>
            </form>

            <div className="mt-8 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">{t("demo-credentials")}:</p>
              <p>Super Admin: admin@university.edu / admin123</p>
              <p>HR Admin: hr@university.edu / hr1234</p>
              <p>Professor: benali@university.edu / prof123</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/70 mt-6 drop-shadow-md">
          &copy; {new Date().getFullYear()} UniGate
        </p>
      </div>
    </div>
  );
}
