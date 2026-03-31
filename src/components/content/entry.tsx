"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { ChevronRight, Pin } from "lucide-react";
import FieldBadge from "./field";
import { cn } from "@/lib/utils";
import type { FieldMapping } from "@/data/fields";

function timeAgo(
    timestamp: number,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t("secondsAgo", { seconds });
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("minutesAgo", { minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hoursAgo", { hours });
    return new Date(timestamp).toLocaleDateString();
}

function hasNestedObjects(entry: Record<string, unknown>): boolean {
    return Object.values(entry).some((v) => v !== null && typeof v === "object");
}

/* ── Recursive branch for nested objects ── */

function BranchNode({
    label,
    value,
    isLast,
    className,
}: {
    label: string;
    value: unknown;
    isLast: boolean;
    className?: string;
}) {
    const isObject = value !== null && typeof value === "object";
    const isEmpty =
        isObject &&
        (Array.isArray(value)
            ? value.length === 0
            : Object.keys(value as Record<string, unknown>).length === 0);
    const [expanded, setExpanded] = useState(true);

    const entries =
        isObject && !isEmpty
            ? Array.isArray(value)
                ? value.map((v, i) => [String(i), v] as const)
                : (Object.entries(value as Record<string, unknown>) as [string, unknown][])
            : [];

    return (
        <div className={cn("relative pl-5", className)}>
            {/* Vertical line */}
            {!isLast && <div className="absolute left-1 top-0 bottom-0 w-[2px] bg-border" />}
            {/* Horizontal stub */}
            {!isLast && <div className="absolute left-1 top-[9px] h-[2px] w-3 bg-border" />}
            {/* Last item */}
            {isLast && (
                <div
                    className="absolute left-1 top-0 w-3 border-l-2 border-b-2 border-border rounded-bl-[4px]"
                    style={{ height: 10 }}
                />
            )}

            <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                {isObject && !isEmpty ? (
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="flex items-center gap-1 min-w-0 group/chevron"
                    >
                        <ChevronRight
                            className={cn(
                                "size-2.5 shrink-0 text-muted-foreground group-hover/chevron:text-foreground transition-all duration-150",
                                expanded && "rotate-90"
                            )}
                        />
                        <span className="text-xs font-medium text-foreground">{label}</span>
                    </button>
                ) : (
                    <>
                        <span className="text-xs text-muted-foreground ml-1">{label}</span>
                        {!isObject && (
                            <span className="text-xs text-foreground break-all">
                                {String(value)}
                            </span>
                        )}
                        {isObject && isEmpty && (
                            <span className="text-xs text-muted-foreground">
                                {Array.isArray(value) ? "[]" : "{}"}
                            </span>
                        )}
                    </>
                )}
            </div>

            {isObject &&
                expanded &&
                entries.length > 0 &&
                entries.map(([key, val], i) => (
                    <BranchNode
                        key={key}
                        label={key}
                        value={val}
                        isLast={i === entries.length - 1}
                    />
                ))}
        </div>
    );
}

/* ── Main entry ── */

interface EntryItemProps {
    entry: Record<string, unknown>;
    fieldMapping: FieldMapping;
    index: number;
    totalCount: number;
    selected?: boolean;
    pinned?: boolean;
    compareSelected?: boolean;
    onSelect?: () => void;
    onTogglePin?: () => void;
    isLast?: boolean;
}

/**
 * Timeline entry card displaying a log entry with status, method, category badges,
 * timestamp, and duration. Supports expanding nested objects as a tree,
 * pin toggling, selection highlighting, and compare mode.
 *
 * @param props.entry - The log entry data
 * @param props.fieldMapping - Mapping of field types to entry keys
 * @param props.index - The entry's position in the full list
 * @param props.selected - Whether this entry is selected in the detail panel
 * @param props.pinned - Whether this entry is pinned
 * @param props.compareSelected - Whether this entry is selected for comparison
 * @param props.onSelect - Callback when the entry is clicked
 * @param props.onTogglePin - Callback to toggle pin state
 * @param props.isLast - Whether this is the last entry in the timeline
 */
export default function EntryItem({
    entry,
    fieldMapping,
    index,
    totalCount,
    selected,
    pinned,
    compareSelected,
    onSelect,
    onTogglePin,
    isLast = false,
}: EntryItemProps) {
    const t = useTranslations("stats");
    const [expanded, setExpanded] = useState(false);
    const statusVal = fieldMapping.status ? entry[fieldMapping.status] : undefined;
    const methodVal = fieldMapping.method ? entry[fieldMapping.method] : undefined;
    const timestampVal = fieldMapping.timestamp ? entry[fieldMapping.timestamp] : undefined;
    const durationVal = fieldMapping.duration ? entry[fieldMapping.duration] : undefined;
    const categoryVal = fieldMapping.category ? entry[fieldMapping.category] : undefined;

    const hasStatus = statusVal !== undefined && typeof statusVal === "number";
    const hasMethod = methodVal !== undefined && typeof methodVal === "string";
    const primaryText = `${t("entry")} ${totalCount - index}`;
    const ts = typeof timestampVal === "number" ? timestampVal : undefined;
    const expandable = hasNestedObjects(entry);

    const selectedRing = compareSelected
        ? "ring-2 ring-amber-500/50 border-amber-500/30"
        : selected
          ? "ring-2 ring-primary/50 border-primary/30"
          : "";

    const nestedEntries = Object.entries(entry).filter(
        ([, v]) => v !== null && typeof v === "object"
    );

    return (
        <div className={cn("relative", "py-1")}>
            {/* Continuous vertical line (non-last entries) */}
            {!isLast && <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-border" />}

            <div className="relative flex items-stretch cursor-pointer group">
                {/* Timeline connector */}
                <div className="relative w-7 shrink-0">
                    {/* Last entry: line from top to center only */}
                    {isLast && (
                        <div className="absolute left-[3px] top-0 h-1/2 w-[2px] bg-border" />
                    )}
                    {/* Dot */}
                    <div
                        className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 size-2 rounded-full z-10 transition-colors",
                            selected ? "bg-primary" : "bg-border group-hover:bg-muted-foreground"
                        )}
                    />
                </div>

                {/* Card */}
                <div className="flex-1 ml-1 flex flex-col">
                    <div
                        onClick={onSelect}
                        className={cn(
                            "flex items-center gap-2 rounded-md border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden",
                            "py-2 px-3",
                            "text-sm",
                            selectedRing
                        )}
                    >
                        {expandable && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded((prev) => !prev);
                                }}
                                className="shrink-0 p-0.5 -ml-1 rounded hover:bg-muted transition-colors"
                            >
                                <ChevronRight
                                    className={cn(
                                        "size-3.5 text-muted-foreground transition-transform duration-150",
                                        expanded && "rotate-90"
                                    )}
                                />
                            </button>
                        )}
                        {hasStatus && <FieldBadge value={statusVal} type="status" />}
                        {hasMethod && <FieldBadge value={String(methodVal)} type="method" />}
                        {categoryVal != null && (
                            <FieldBadge value={String(categoryVal)} type="category" />
                        )}
                        <span className="truncate flex-1 font-medium">{String(primaryText)}</span>
                        {durationVal != null && (
                            <span className="text-xs text-muted-foreground shrink-0">
                                {String(durationVal)}
                            </span>
                        )}
                        {ts && (
                            <span
                                className="text-xs text-muted-foreground shrink-0"
                                title={new Date(ts).toLocaleString()}
                            >
                                {timeAgo(ts, t)}
                            </span>
                        )}
                        {onTogglePin && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePin();
                                }}
                                className={cn(
                                    "shrink-0 p-0.5 rounded transition-all duration-200 overflow-hidden",
                                    pinned
                                        ? "text-primary w-5"
                                        : "w-0 opacity-0 group-hover:w-5 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Pin className={cn("size-3.5", pinned && "fill-current")} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded children with branch curves */}
            {expanded && nestedEntries.length > 0 && (
                <div className="pl-9 py-1">
                    {nestedEntries.map(([key, value], i) => (
                        <BranchNode
                            key={key}
                            label={key}
                            value={value}
                            isLast={i === nestedEntries.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}