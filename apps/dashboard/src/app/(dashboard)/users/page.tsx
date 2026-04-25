"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  const { data: classGroups } = useQuery({
    queryKey: ["allClassGroups"],
    queryFn: () => api.get("/api/master-data/class-groups").then((r) => r.data.data),
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["users", page, search, classGroupId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (classGroupId) params.set("classGroupId", classGroupId);
      return api.get(`/api/users?${params}`).then((r) => r.data);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage students, professors, and administrators</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input placeholder="Search name, email, student ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-72" />
        <select className="border rounded-md px-3 py-2 text-sm" value={classGroupId} onChange={(e) => { setClassGroupId(e.target.value); setPage(1); }}>
          <option value="">All Classes</option>
          {classGroups?.map((cg: any) => (
            <option key={cg.id} value={cg.id}>{cg.name} - {cg.speciality?.name} ({cg.level})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Student ID</th>
              <th className="px-3 py-2 text-left">Class / Group</th>
              <th className="px-3 py-2 text-left">Speciality</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">RFID</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {result?.data?.map((user: any) => (
              <tr key={user.id} className="border-t">
                <td className="px-3 py-2 font-medium">{user.firstName} {user.lastName}</td>
                <td className="px-3 py-2 text-xs">{user.email}</td>
                <td className="px-3 py-2">{user.studentId || "-"}</td>
                <td className="px-3 py-2 text-xs">{user.classGroup ? `${user.classGroup.name} (${user.classGroup.level})` : "-"}</td>
                <td className="px-3 py-2 text-xs">{user.classGroup?.speciality?.name || "-"}</td>
                <td className="px-3 py-2"><Badge variant="outline">{user.role?.name}</Badge></td>
                <td className="px-3 py-2 text-xs">{user.rfidCard?.uid || "-"}</td>
                <td className="px-3 py-2">
                  <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/users/${user.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                </td>
              </tr>
            ))}
            {result?.data?.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {result?.pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {result.pagination.page} of {result.pagination.totalPages} ({result.pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= result.pagination.totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
