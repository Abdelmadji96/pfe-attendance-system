"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/use-auth";
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
  Fingerprint,
  Database,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  if (!hasPermission) return null;

  const Icon = iconMap[item.icon] || LayoutDashboard;

  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-2")}>
          <Fingerprint className="h-7 w-7 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">Attendance</span>
          )}
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => (
            <NavItem
              key={`${item.href}-${idx}`}
              item={item}
              collapsed={collapsed}
              isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
            />
          ))}
        </nav>

        <Separator />

        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
