"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { API_ORIGIN } from "@/lib/api";
import { Bell, ChevronRight, LogOut, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitleKeys: Record<string, string> = {
  "/dashboard": "dashboard",
  "/attendance": "attendance",
  "/master-data": "master-data",
  "/modules": "modules",
  "/enrollment": "enrollment",
  "/users": "students",
  "/staff": "staff",
  "/verification": "verification",
  "/settings": "settings",
  "/roles": "roles",
};

function getPageTitleKey(pathname: string): string {
  if (pageTitleKeys[pathname]) return pageTitleKeys[pathname];
  const basePath = "/" + pathname.split("/")[1];
  return pageTitleKeys[basePath] || "dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  const pageTitle = t(getPageTitleKey(pathname));
  const isDetailPage = pathname.split("/").length > 2;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const avatarSrc = user.avatarUrl ? `${API_ORIGIN}${user.avatarUrl}` : null;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200/60 bg-white/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-biskra-primary to-biskra-primary-dark shadow-md shadow-biskra-primary/20">
          <Fingerprint className="h-4 w-4 text-white" />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>
          {isDetailPage && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">{t("details")}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Button>

        <div className="mx-2 h-8 w-px bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-biskra-primary to-biskra-primary-dark ring-2 ring-biskra-primary/20">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-white">{initials}</span>
            )}
          </div>
          <div className="hidden flex-col items-start md:flex">
            <span className="text-sm font-semibold text-gray-800">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-gray-500">
              {user.role.name.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
