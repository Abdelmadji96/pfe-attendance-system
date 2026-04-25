"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h2 className="text-lg font-semibold">RFID + Face Recognition Attendance</h2>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden md:block">
                <p className="font-medium">{user.firstName} {user.lastName}</p>
                <Badge variant="secondary" className="text-xs">
                  {user.role.name.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
