"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/layout/auth-guard";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <ScrollArea className="flex-1">
            <main className="p-6">{children}</main>
          </ScrollArea>
        </div>
      </div>
    </AuthGuard>
  );
}
