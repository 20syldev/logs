"use client";

import { type RefObject, useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Download,
    Eraser,
    GitCompareArrows,
    Pause,
    Play,
    Timer,
    Volume2,
    VolumeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { statusDotColor } from "@/data/constants";
import type { FetchStatus } from "@/data/constants";
import type { DataEntry } from "@/hooks/fetcher";
import type { Filters } from "@/data/presets";

interface ToolbarProps {
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    status: FetchStatus;
    totalCount: number;
    interval: number;
    onIntervalChange: (interval: number) => void;
    onPause: () => void;
    onResume: () => void;
    onClear: () => void;
    logs: DataEntry[];
    searchRef?: RefObject<HTMLInputElement | null>;
    compareMode?: boolean;
    onToggleCompare?: () => void;
    soundEnabled?: boolean;
    onToggleSound?: () => void;
    allLogs?: DataEntry[];
}

const statusOptions = ["2xx", "3xx", "4xx", "5xx"];
const methodOptions = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const statusToggleColors: Record<string, string> = {
    "2xx": "data-[active=true]:bg-status-2xx data-[active=true]:text-white",
    "3xx": "data-[active=true]:bg-status-3xx data-[active=true]:text-white",
    "4xx": "data-[active=true]:bg-status-4xx data-[active=true]:text-white",
    "5xx": "data-[active=true]:bg-status-5xx data-[active=true]:text-white",
};

const methodToggleColors: Record<string, string> = {
    GET: "data-[active=true]:bg-method-get data-[active=true]:text-white",
    POST: "data-[active=true]:bg-method-post data-[active=true]:text-white",
    PUT: "data-[active=true]:bg-method-put data-[active=true]:text-white",
    PATCH: "data-[active=true]:bg-method-patch data-[active=true]:text-white",
    DELETE: "data-[active=true]:bg-method-delete data-[active=true]:text-white",
};

function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

const intervalPresets = [
    { value: 1000, label: "1s" },
    { value: 2000, label: "2s" },
    { value: 5000, label: "5s" },
    { value: 10000, label: "10s" },
    { value: 30000, label: "30s" },
];

function exportLogs(logs: DataEntry[]) {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowers-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Toolbar component with status/method filter toggles, polling controls,
 * interval configuration, download options, search input, compare mode toggle,
 * and sound notifications toggle.
 *
 * @param props.filters - Current active filters
 * @param props.onFiltersChange - Callback to update filters
 * @param props.status - Current fetch status (connecting, connected, paused, error, empty)
 * @param props.totalCount - Total number of unfiltered entries
 * @param props.interval - Current polling interval in ms
 * @param props.onIntervalChange - Callback to change polling interval
 * @param props.onPause - Callback to pause polling
 * @param props.onResume - Callback to resume polling
 * @param props.onClear - Callback to clear all entries
 * @param props.logs - Currently filtered log entries
 * @param props.searchRef - Ref to the search input for keyboard shortcut focus
 * @param props.compareMode - Whether compare mode is active
 * @param props.onToggleCompare - Callback to toggle compare mode
 * @param props.soundEnabled - Whether sound alerts are enabled
 * @param props.onToggleSound - Callback to toggle sound alerts
 * @param props.allLogs - All unfiltered log entries (for download all option)
 */
export default function Toolbar({
    filters,
    onFiltersChange,
    status,
    totalCount,
    onPause,
    onResume,
    onClear,
    logs,
    searchRef,
    interval,
    onIntervalChange,
    compareMode,
    onToggleCompare,
    soundEnabled,
    onToggleSound,
    allLogs,
}: ToolbarProps) {
    const isPaused = status === "paused";
    const [intervalOpen, setIntervalOpen] = useState(false);
    const [customMs, setCustomMs] = useState("");
    const t = useTranslations("toolbar");
    const tc = useTranslations("common");

    const intervalLabel =
        interval === 0
            ? t("never")
            : (intervalPresets.find((p) => p.value === interval)?.label ?? `${interval / 1000}s`);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
                <div className={cn("size-2 rounded-full shrink-0", statusDotColor[status])} />
                {logs.length !== totalCount && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {logs.length} / {totalCount}
                    </span>
                )}

                <div className="flex gap-1">
                    {statusOptions.map((s) => (
                        <Button
                            key={s}
                            variant="outline"
                            size="sm"
                            data-active={filters.statuses.includes(s)}
                            className={cn("h-7 px-2 text-xs", statusToggleColors[s])}
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    statuses: toggleArrayItem(filters.statuses, s),
                                })
                            }
                        >
                            {s}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-1">
                    {methodOptions.map((m) => (
                        <Button
                            key={m}
                            variant="outline"
                            size="sm"
                            data-active={filters.methods.includes(m)}
                            className={cn("h-7 px-2 text-xs", methodToggleColors[m])}
                            onClick={() =>
                                onFiltersChange({
                                    ...filters,
                                    methods: toggleArrayItem(filters.methods, m),
                                })
                            }
                        >
                            {m}
                        </Button>
                    ))}
                </div>

                <TooltipProvider>
                    <div className="ml-auto flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={isPaused ? onResume : onPause}
                                >
                                    {isPaused ? (
                                        <Play className="size-3.5" />
                                    ) : (
                                        <Pause className="size-3.5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isPaused ? t("resume") : t("pause")}</TooltipContent>
                        </Tooltip>
                        {onToggleSound && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-7 w-7 p-0",
                                            soundEnabled && "text-primary"
                                        )}
                                        onClick={onToggleSound}
                                    >
                                        {soundEnabled ? (
                                            <Volume2 className="size-3.5" />
                                        ) : (
                                            <VolumeOff className="size-3.5" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("sound")}</TooltipContent>
                            </Tooltip>
                        )}
                        <Dialog open={intervalOpen} onOpenChange={setIntervalOpen}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-1.5 text-xs gap-1"
                                        >
                                            <Timer className="size-3.5" />
                                            {intervalLabel}
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t("interval")}</TooltipContent>
                            </Tooltip>
                            <DialogContent className="max-w-xs" aria-describedby={undefined}>
                                <DialogHeader>
                                    <DialogTitle>{t("interval")}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant={interval === 0 ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => {
                                            onIntervalChange(0);
                                            setIntervalOpen(false);
                                        }}
                                    >
                                        {t("never")}
                                    </Button>
                                    {intervalPresets.map((p) => (
                                        <Button
                                            key={p.value}
                                            variant={interval === p.value ? "default" : "outline"}
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                onIntervalChange(p.value);
                                                setIntervalOpen(false);
                                            }}
                                        >
                                            {p.label}
                                        </Button>
                                    ))}
                                </div>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const ms = Number(customMs);
                                        if (ms > 0) {
                                            onIntervalChange(ms);
                                            setIntervalOpen(false);
                                            setCustomMs("");
                                        }
                                    }}
                                    className="flex gap-2"
                                >
                                    <Input
                                        type="number"
                                        min={100}
                                        step={100}
                                        placeholder={t("customPlaceholder")}
                                        value={customMs}
                                        onChange={(e) => setCustomMs(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        className="h-8"
                                        disabled={!customMs || Number(customMs) < 100}
                                    >
                                        {tc("apply")}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                        <Dialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            disabled={!logs.length}
                                        >
                                            <Download className="size-3.5" />
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t("download")}</TooltipContent>
                            </Tooltip>
                            <DialogContent className="max-w-xs" aria-describedby={undefined}>
                                <DialogHeader>
                                    <DialogTitle>{t("download")}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="justify-between text-xs"
                                        onClick={() => exportLogs(logs)}
                                    >
                                        {t("downloadFiltered")}
                                        <span className="text-muted-foreground ml-2">
                                            {logs.length}
                                        </span>
                                    </Button>
                                    {allLogs && allLogs.length !== logs.length && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="justify-between text-xs"
                                            onClick={() => exportLogs(allLogs)}
                                        >
                                            {t("downloadAll")}
                                            <span className="text-muted-foreground ml-2">
                                                {allLogs.length}
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onClear()}
                                    disabled={!logs.length}
                                >
                                    <Eraser className="size-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("clear")}</TooltipContent>
                        </Tooltip>
                        {onToggleCompare && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-7 w-7 p-0",
                                            compareMode && "bg-primary/10 text-primary"
                                        )}
                                        onClick={onToggleCompare}
                                    >
                                        <GitCompareArrows className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("compare")}</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </TooltipProvider>
            </div>

            <div className="flex items-center gap-2">
                <Input
                    ref={searchRef}
                    placeholder={t("searchPlaceholder")}
                    value={filters.search}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="h-8 text-sm flex-1"
                />
            </div>
        </div>
    );
}
