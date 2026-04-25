"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, Check } from "lucide-react";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  requiredColumns: string[];
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

export default function CsvImportDialog({ open, onOpenChange, entityType, requiredColumns }: CsvImportDialogProps) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const importMutation = useMutation({
    mutationFn: () => api.post("/api/master-data/import-csv", { entityType, rows }),
    onSuccess: (res) => {
      qc.invalidateQueries();
      alert(`Import complete: ${res.data.data.created} of ${res.data.data.total} created`);
      handleClose();
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setRows([]);
    setFileName("");
    onOpenChange(false);
  };

  if (!open) return null;

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Import CSV - {entityType}</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Required columns: {requiredColumns.map((c) => <Badge key={c} variant="outline" className="ml-1">{c}</Badge>)}
            </p>
            <div className="flex gap-2 items-center">
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />Choose CSV File
              </Button>
              {fileName && <span className="text-sm flex items-center gap-1"><FileText className="h-4 w-4" />{fileName}</span>}
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <div className="rounded-md border overflow-auto max-h-60">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.map((h) => <td key={h} className="px-3 py-2">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">{rows.length} rows to import{rows.length > 50 ? " (showing first 50)" : ""}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                  <Check className="mr-2 h-4 w-4" />Import {rows.length} Rows
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
