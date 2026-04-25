"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScanLine, Camera, CheckCircle, XCircle, Clock, BookOpen, MapPin, Loader2 } from "lucide-react";

type VerificationState = "idle" | "scanned" | "verifying" | "done";

export default function VerificationPage() {
  const [rfidUid, setRfidUid] = useState("");
  const [simulateMatch, setSimulateMatch] = useState(true);
  const [state, setState] = useState<VerificationState>("idle");
  const [result, setResult] = useState<any>(null);

  const verifyMutation = useMutation({
    mutationFn: () => api.post("/api/verification/mock-entry", { rfidUid, simulateMatch }),
    onMutate: () => setState("verifying"),
    onSuccess: (res) => {
      setResult(res.data.data);
      setState("done");
    },
    onError: () => setState("idle"),
  });

  const handleScan = () => {
    if (!rfidUid) return;
    setState("scanned");
    setTimeout(() => verifyMutation.mutate(), 800);
  };

  const reset = () => {
    setState("idle");
    setResult(null);
    setRfidUid("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Test</h1>
        <p className="text-muted-foreground">Simulate RFID tap, session check, and face verification</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Input */}
        <Card>
          <CardHeader><CardTitle>Simulate Entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>RFID UID</Label>
              <Input placeholder="e.g. RFID000001" value={rfidUid} onChange={(e) => setRfidUid(e.target.value)} disabled={state !== "idle"} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={simulateMatch} onChange={() => setSimulateMatch(true)} /> Match
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!simulateMatch} onChange={() => setSimulateMatch(false)} /> Mismatch
              </label>
            </div>

            {state === "idle" && (
              <Button className="w-full" onClick={handleScan} disabled={!rfidUid}><ScanLine className="mr-2 h-4 w-4" />Tap RFID Card</Button>
            )}
            {state === "scanned" && (
              <div className="text-center py-4">
                <Camera className="h-12 w-12 mx-auto text-blue-500 animate-pulse mb-2" />
                <p className="text-sm text-muted-foreground">Checking session schedule...</p>
              </div>
            )}
            {state === "verifying" && (
              <div className="text-center py-4">
                <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">Verifying face...</p>
              </div>
            )}
            {state === "done" && (
              <Button variant="outline" className="w-full" onClick={reset}>Reset & Try Again</Button>
            )}
          </CardContent>
        </Card>

        {/* Right: Result */}
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p>Waiting for verification...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* LED indicator */}
                <div className="flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    result.ledFeedback === "GREEN" ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {result.ledFeedback === "GREEN"
                      ? <CheckCircle className="h-10 w-10 text-green-600" />
                      : <XCircle className="h-10 w-10 text-red-600" />
                    }
                  </div>
                </div>

                <div className="text-center">
                  <Badge variant={result.verificationResult === "MATCH" ? "default" : "destructive"} className="text-base px-4 py-1">
                    {result.verificationResult}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
                </div>

                <Separator />

                {/* Session info */}
                {result.sessionInfo && (
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" />Active Session</h4>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div>Module: <span className="font-medium">{result.sessionInfo.moduleName}</span></div>
                      <div>Code: <Badge variant="outline">{result.sessionInfo.moduleCode}</Badge></div>
                      {result.sessionInfo.roomName && (
                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />Room: {result.sessionInfo.roomName}</div>
                      )}
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{result.sessionInfo.startTime} - {result.sessionInfo.endTime}</div>
                    </div>
                  </div>
                )}

                {result.verificationResult === "NO_SESSION" && (
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800">No module session is currently active for this student&apos;s class group.</div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.user && <div>Student: <span className="font-medium">{result.user.firstName} {result.user.lastName}</span></div>}
                  {result.similarityScore !== null && <div>Score: <span className="font-medium">{(result.similarityScore * 100).toFixed(1)}%</span></div>}
                  <div>Buzzer: <Badge variant="outline">{result.buzzerFeedback}</Badge></div>
                  <div>Attendance: <Badge variant={result.attendanceMarked ? "default" : "secondary"}>{result.attendanceMarked ? "Marked" : "Not marked"}</Badge></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
