"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermission, useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";
import { NAV_ITEMS } from "@pfe/shared";
import {
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Users,
  ScanFace,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Database,
  BookOpen,
  GraduationCap,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Users,
  ScanFace,
  Settings,
  Shield,
  Database,
  BookOpen,
  GraduationCap,
  UserCog,
};

function NavItem({
  item,
  collapsed,
  isActive,
}: {
  item: (typeof NAV_ITEMS)[number];
  collapsed: boolean;
  isActive: boolean;
}) {
  const hasPermission = usePermission(item.permission);
  const hidePermission = "hideIfPermission" in item ? item.hideIfPermission : null;
  const shouldHide = usePermission(hidePermission ?? null);
  const { t, dir } = useI18n();
  if (!hasPermission || shouldHide) return null;

  const Icon = iconMap[item.icon] || LayoutDashboard;
  const translationKey = item.href.replace("/", "") || "dashboard";
  const label = t(translationKey) !== translationKey ? t(translationKey) : item.label;

  const tooltipSide = dir === "rtl" ? "left" : "right";

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl font-medium transition-all duration-300",
        collapsed ? "justify-center p-3" : "px-4 py-3",
        isActive
          ? "bg-gradient-to-r from-biskra-primary to-biskra-primary-dark text-white shadow-lg shadow-biskra-primary/30"
          : "text-gray-600 hover:bg-white hover:text-biskra-secondary hover:shadow-md"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-all duration-300",
          collapsed ? "h-8 w-8" : "h-10 w-10",
          isActive
            ? "bg-white/20"
            : "bg-gray-100 group-hover:bg-biskra-primary/10 group-hover:text-biskra-primary"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-all duration-300",
            isActive ? "text-white" : "text-gray-500 group-hover:text-biskra-primary"
          )}
        />
      </div>

      {!collapsed && (
        <span
          className={cn(
            "text-[15px] font-medium transition-colors duration-300",
            isActive ? "text-white" : "text-gray-700 group-hover:text-biskra-secondary"
          )}
        >
          {label}
        </span>
      )}

      {isActive && !collapsed && (
        <div className="absolute end-4 h-2 w-2 rounded-full bg-white/80" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent
          side={tooltipSide as any}
          className="ms-2 rounded-xl bg-biskra-secondary px-3 py-2 text-sm font-medium text-white shadow-lg"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t, dir } = useI18n();

  const CollapseIcon = dir === "rtl"
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col transition-all duration-300",
          collapsed ? "w-20" : "w-72"
        )}
        style={{
          background: "linear-gradient(180deg, #f0f7f1 0%, #dceadd 50%, #c8ddc9 100%)",
        }}
      >
        <div
          className={cn(
            "flex items-center justify-center border-b border-gray-200/50",
            collapsed ? "h-24 px-3" : "h-28 px-5"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/50",
              collapsed ? "p-2" : "py-4 px-3 w-full"
            )}
          >
            {collapsed ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg shadow-biskra-primary/15 transition-transform duration-300 hover:scale-105 overflow-hidden">
                <Image
                  src="/images/unigate-logo.png"
                  alt="UniGate"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-md overflow-hidden">
                  <Image
                    src="/images/unigate-logo.png"
                    alt="UniGate"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-biskra-secondary leading-tight">
                    UniGate
                  </span>
                  <span className="text-xs text-gray-500 leading-tight">
                    {t("university-attendance-system")}
                  </span>
                </div>
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1 py-6 overflow-y-auto scrollbar-thin">
          <nav className={cn("space-y-2", collapsed ? "px-3" : "px-4")}>
            {NAV_ITEMS.map((item, idx) => (
              <NavItem
                key={`${item.href}-${idx}`}
                item={item}
                collapsed={collapsed}
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))}
              />
            ))}
          </nav>
        </div>

        <div className={cn("border-t border-gray-200/60 p-4", collapsed && "px-3")}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full rounded-xl text-gray-500 hover:bg-white hover:text-biskra-secondary hover:shadow-sm transition-all duration-300",
              collapsed ? "p-3" : "justify-start gap-3 px-4 py-3"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            <div className="flex items-center justify-center rounded-lg bg-gray-100 h-8 w-8">
              <CollapseIcon className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm font-medium">{t("collapse-menu")}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "mt-2 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300",
              collapsed ? "p-3" : "justify-start gap-3 px-4 py-3"
            )}
            onClick={logout}
          >
            <div className="flex items-center justify-center rounded-lg bg-gray-100 h-8 w-8">
              <LogOut className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm font-medium">{t("sign-out")}</span>}
          </Button>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-biskra-gold to-transparent opacity-60" />
      </aside>
    </TooltipProvider>
  );
}
