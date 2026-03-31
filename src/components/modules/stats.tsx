"use client";

import { useTranslations } from "@/i18n/provider";
import type { DataEntry } from "@/hooks/fetcher";
import { useEffect, useMemo, useState } from "react";

interface StatsProps {
    logs: DataEntry[];
}

function formatTimeAgo(
    timestamp: number,
    now: number,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 5) return t("justNow");
    if (seconds < 60) return t("secondsAgo", { seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("minutesAgo", { minutes });
    return t("hoursAgo", { hours: Math.floor(minutes / 60) });
}

/**
 * Statistics panel displaying aggregated log metrics.
 * Shows total count, status code distribution with progress bars,
 * error rate percentage, and time since last log entry.
 *
 * @param props.logs - Log entries to compute statistics from
 */
export default function Stats({ logs }: StatsProps) {
    const t = useTranslations("stats");
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(id);
    }, []);

    const stats = useMemo(() => {
        const byStatus = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
        const byMethod: Record<string, number> = {};
        let latest = 0;

        for (const log of logs) {
            const statusVal = log.status ?? log.statusCode ?? log.status_code ?? log.code;
            if (typeof statusVal === "number") {
                const prefix = (String(statusVal).charAt(0) + "xx") as keyof typeof byStatus;
                if (prefix in byStatus) byStatus[prefix]++;
            }
            const methodVal = log.method ?? log.verb ?? log.action;
            if (typeof methodVal === "string") {
                const method = methodVal.toUpperCase();
                byMethod[method] = (byMethod[method] || 0) + 1;
            }
            const tsVal = log.timestamp ?? log.time ?? log.date ?? log.created_at;
            if (typeof tsVal === "number" && tsVal > latest) latest = tsVal;
        }

        const total = logs.length;
        const errorRate =
            total > 0 ? Math.round(((byStatus["4xx"] + byStatus["5xx"]) / total) * 100) : 0;

        return { total, byStatus, byMethod, errorRate, latest };
    }, [logs]);

    if (!stats.total) return null;

    const statusColors = {
        "2xx": "bg-status-2xx",
        "3xx": "bg-status-3xx",
        "4xx": "bg-status-4xx",
        "5xx": "bg-status-5xx",
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("total")}</span>
                <span className="font-medium">{stats.total}</span>
            </div>

            <div className="space-y-1.5">
                {(Object.entries(stats.byStatus) as [string, number][]).map(([key, count]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-muted-foreground">{key}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted-bg overflow-hidden">
                            <div
                                className={`h-full rounded-full ${statusColors[key as keyof typeof statusColors]}`}
                                style={{
                                    width: stats.total ? `${(count / stats.total) * 100}%` : "0%",
                                }}
                            />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("errorRate")}</span>
                <span
                    className={`font-medium ${stats.errorRate > 10 ? "text-status-4xx" : "text-status-2xx"}`}
                >
                    {stats.errorRate}%
                </span>
            </div>

            {stats.latest > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("lastLog")}</span>
                    <span className="text-muted-foreground">
                        {formatTimeAgo(stats.latest, now, t)}
                    </span>
                </div>
            )}
        </div>
    );
}