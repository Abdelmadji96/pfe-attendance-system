"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScanFace, Shield, BarChart3, AlertCircle } from "lucide-react";
import type { EvaluationResultDto, EvaluationSummaryDto } from "@pfe/shared";

function pct(value: number, digits = 2) {
  return `${(value * 100).toFixed(digits)}%`;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ConfusionMatrix({ result }: { result: EvaluationResultDto }) {
  const { tp, tn, fp, fn } = result.counts;

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="p-3 text-left font-medium text-muted-foreground" />
            <th className="p-3 text-center font-medium">Predicted +</th>
            <th className="p-3 text-center font-medium">Predicted −</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-3 font-medium text-muted-foreground">Actual +</td>
            <td className="p-3 text-center font-semibold text-emerald-700 bg-emerald-50">TP {tp.toLocaleString()}</td>
            <td className="p-3 text-center font-semibold text-amber-700 bg-amber-50">FN {fn.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="p-3 font-medium text-muted-foreground">Actual −</td>
            <td className="p-3 text-center font-semibold text-red-700 bg-red-50">FP {fp.toLocaleString()}</td>
            <td className="p-3 text-center font-semibold text-blue-700 bg-blue-50">TN {tn.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function EvaluationCard({
  title,
  icon: Icon,
  result,
  emptyLabel,
  meta,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  result: EvaluationResultDto | null;
  emptyLabel: string;
  meta?: React.ReactNode;
}) {
  const { t } = useI18n();

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-biskra-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8 opacity-50" />
            <p className="text-sm text-center">{emptyLabel}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = result.metrics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-biskra-primary" />
            {title}
          </CardTitle>
          <Badge variant="outline">{result.system}</Badge>
        </div>
        {meta}
      </CardHeader>
      <CardContent className="space-y-5">
        <ConfusionMatrix result={result} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricTile label={t("metric-accuracy")} value={pct(m.Accuracy, 4)} />
          <MetricTile label={t("metric-precision")} value={pct(m.Precision, 4)} />
          <MetricTile label={t("metric-recall")} value={pct(m.Recall, 4)} />
          <MetricTile label={t("metric-f1")} value={pct(m["F1-Score"], 4)} />
          <MetricTile label={t("metric-far")} value={pct(m.FAR, 4)} />
          <MetricTile label={t("metric-frr")} value={pct(m.FRR, 4)} />
        </div>

        {(result.skipped ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("eval-skipped")}: {result.skipped}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function EvaluationPage() {
  const { t } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["evaluation-metrics"],
    queryFn: () =>
      api.get("/api/evaluation/metrics").then((r) => r.data.data as EvaluationSummaryDto),
  });

  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <BarChart3 className="h-8 w-8 text-biskra-primary" />
            {t("evaluation")}
          </h1>
          <p className="text-muted-foreground">{t("eval-subtitle")}</p>
        </div>
        {updatedLabel && (
          <p className="text-sm text-muted-foreground">
            {t("eval-last-updated")}: {updatedLabel}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t("eval-load-error")}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <EvaluationCard
              title={t("eval-face-title")}
              icon={ScanFace}
              result={data.faceRecognition}
              emptyLabel={t("eval-face-empty")}
              meta={
                data.faceRecognition ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {data.faceRecognition.threshold != null && (
                      <span>{t("eval-threshold")}: {data.faceRecognition.threshold}</span>
                    )}
                    {data.faceRecognition.gallery_identities != null && (
                      <span>{t("eval-identities")}: {data.faceRecognition.gallery_identities}</span>
                    )}
                  </div>
                ) : null
              }
            />
            <EvaluationCard
              title={t("eval-antispoof-title")}
              icon={Shield}
              result={data.antiSpoof}
              emptyLabel={t("eval-antispoof-empty")}
              meta={
                data.antiSpoof ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {data.antiSpoof.live_images != null && (
                      <span>{t("eval-live-images")}: {data.antiSpoof.live_images}</span>
                    )}
                    {data.antiSpoof.spoof_images != null && (
                      <span>{t("eval-spoof-images")}: {data.antiSpoof.spoof_images}</span>
                    )}
                  </div>
                ) : null
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("eval-how-to-refresh")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{t("eval-refresh-step-1")}</p>
              <p>{t("eval-refresh-step-2")}</p>
              <p className="font-mono text-xs break-all">{data.resultsDir}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
