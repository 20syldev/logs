"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "@/i18n/provider";
import { hashEntry } from "@/lib/hash";
import EntryItem from "./entry";
import type { DataEntry } from "@/hooks/fetcher";
import type { FieldMapping } from "@/data/fields";
const ENTRY_HEIGHT_ESTIMATE = 52;
const HEADER_HEIGHT = 32;

type VirtualRow =
    | { kind: "entry"; entry: DataEntry; entryIndex: number; globalIndex: number }
    | { kind: "header"; label: string };

function getTimeGroup(ts: number, t: (key: string) => string): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return t("justNow");
    if (diff < 300_000) return t("last5min");
    if (diff < 3_600_000) return t("lastHour");
    if (diff < 86_400_000) return t("today");
    return new Date(ts).toLocaleDateString();
}

function buildVirtualRows(
    entries: DataEntry[],
    timestampKey: string | undefined,
    pinnedOffset: number,
    t: (key: string) => string
): VirtualRow[] {
    if (!timestampKey || entries.length === 0) {
        return entries.map((entry, i) => ({
            kind: "entry",
            entry,
            entryIndex: i,
            globalIndex: pinnedOffset + i,
        }));
    }

    const rows: VirtualRow[] = [];
    let lastGroup: string | null = null;

    for (let i = 0; i < entries.length; i++) {
        const ts = entries[i][timestampKey];
        if (typeof ts === "number") {
            const group = getTimeGroup(ts, t);
            if (group !== lastGroup) {
                rows.push({ kind: "header", label: group });
                lastGroup = group;
            }
        }
        rows.push({
            kind: "entry",
            entry: entries[i],
            entryIndex: i,
            globalIndex: pinnedOffset + i,
        });
    }

    return rows;
}

interface TimelineProps {
    pinnedEntries: DataEntry[];
    unpinnedEntries: DataEntry[];
    pinnedHashes: Set<string>;
    onTogglePin?: (entry: DataEntry) => void;
    autoScroll: boolean;
    fieldMapping: FieldMapping;
    totalCount: number;
    selectedIndex?: number;
    onSelect?: (index: number) => void;
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
    compareMode?: boolean;
    compareSelection?: Set<string>;
    onCompareSelect?: (entry: DataEntry) => void;
}

/**
 * Virtualized timeline component that displays pinned and unpinned log entries.
 * Groups unpinned entries by time periods, supports auto-scroll on new entries,
 * compare mode selection, and animated entry transitions.
 *
 * @param props.pinnedEntries - Entries pinned to the top (not virtualized)
 * @param props.unpinnedEntries - Regular entries (virtualized with tanstack-virtual)
 * @param props.pinnedHashes - Set of hashes for pinned entries
 * @param props.onTogglePin - Callback to pin/unpin an entry
 * @param props.autoScroll - Whether to auto-scroll to top on new entries
 * @param props.fieldMapping - Mapping of field types to entry keys
 * @param props.selectedIndex - Index of the currently selected entry
 * @param props.onSelect - Callback when an entry is selected
 * @param props.scrollContainerRef - External ref for the scroll container
 * @param props.compareMode - Whether compare mode is active
 * @param props.compareSelection - Set of entry hashes selected for comparison
 * @param props.onCompareSelect - Callback when an entry is selected for comparison
 */
export default function Timeline({
    pinnedEntries,
    unpinnedEntries,
    pinnedHashes,
    onTogglePin,
    autoScroll,
    fieldMapping,
    totalCount,
    selectedIndex,
    onSelect,
    scrollContainerRef,
    compareMode,
    compareSelection,
    onCompareSelect,
}: TimelineProps) {
    const t = useTranslations("timeline");
    const [prevCount, setPrevCount] = useState(totalCount);
    const [newCount, setNewCount] = useState(0);
    const internalRef = useRef<HTMLDivElement>(null);
    const scrollRef = scrollContainerRef ?? internalRef;

    if (totalCount !== prevCount) {
        const added = totalCount - prevCount;
        setNewCount(added > 0 ? added : 0);
        setPrevCount(totalCount);
    }

    useEffect(() => {
        if (newCount > 0) {
            const timeout = setTimeout(() => setNewCount(0), 500 + newCount * 75);
            return () => clearTimeout(timeout);
        }
    }, [newCount]);

    useEffect(() => {
        if (autoScroll && newCount > 0 && scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [autoScroll, newCount, scrollRef]);

    const virtualRows = useMemo(
        () => buildVirtualRows(unpinnedEntries, fieldMapping.timestamp, pinnedEntries.length, t),
        [unpinnedEntries, fieldMapping.timestamp, pinnedEntries.length, t]
    );

    const virtualizer = useVirtualizer({
        count: virtualRows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) =>
            virtualRows[index].kind === "header" ? HEADER_HEIGHT : ENTRY_HEIGHT_ESTIMATE,
        overscan: 15,
        getItemKey: (index) => {
            const row = virtualRows[index];
            return row.kind === "header" ? `header-${row.label}` : hashEntry(row.entry);
        },
    });

    useEffect(() => {
        if (selectedIndex === undefined) return;
        const unpinnedEntryIndex = selectedIndex - pinnedEntries.length;
        if (unpinnedEntryIndex < 0) return;
        const virtualIndex = virtualRows.findIndex(
            (r) => r.kind === "entry" && r.entryIndex === unpinnedEntryIndex
        );
        if (virtualIndex >= 0) {
            virtualizer.scrollToIndex(virtualIndex, { align: "auto" });
        }
    }, [selectedIndex, pinnedEntries.length, virtualRows, virtualizer]);

    if (totalCount === 0) return null;

    const unpinnedNewCount = Math.max(0, newCount - pinnedEntries.length);

    return (
        <div ref={scrollContainerRef ? undefined : internalRef}>
            {/* Pinned entries (not virtualized) */}
            {pinnedEntries.map((entry, i) => (
                <EntryItem
                    key={hashEntry(entry)}
                    entry={entry}
                    fieldMapping={fieldMapping}
                    index={i}
                    totalCount={totalCount}
                    selected={!compareMode && selectedIndex === i}
                    pinned={true}
                    onSelect={compareMode ? () => onCompareSelect?.(entry) : () => onSelect?.(i)}
                    onTogglePin={onTogglePin && (() => onTogglePin(entry))}
                    isLast={unpinnedEntries.length === 0 && i === pinnedEntries.length - 1}
                    compareSelected={compareMode && compareSelection?.has(hashEntry(entry))}
                />
            ))}

            {/* Separator */}
            {pinnedEntries.length > 0 && unpinnedEntries.length > 0 && (
                <div className="flex items-center gap-2 py-2 px-2">
                    <div className="h-[1px] flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                        {t("pinned", { count: pinnedEntries.length })}
                    </span>
                    <div className="h-[1px] flex-1 bg-border" />
                </div>
            )}

            {/* Unpinned entries (virtualized with optional time grouping) */}
            {virtualRows.length > 0 && (
                <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                        const row = virtualRows[virtualItem.index];

                        if (row.kind === "header") {
                            return (
                                <div
                                    key={virtualItem.key}
                                    ref={virtualizer.measureElement}
                                    data-index={virtualItem.index}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                >
                                    <div className="flex items-center gap-2 py-1.5 px-2">
                                        <div className="h-[1px] flex-1 bg-border" />
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {row.label}
                                        </span>
                                        <div className="h-[1px] flex-1 bg-border" />
                                    </div>
                                </div>
                            );
                        }

                        const isNew = row.entryIndex < unpinnedNewCount;
                        return (
                            <div
                                key={virtualItem.key}
                                ref={virtualizer.measureElement}
                                data-index={virtualItem.index}
                                className={
                                    isNew
                                        ? "animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-backwards"
                                        : ""
                                }
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualItem.start}px)`,
                                    ...(isNew
                                        ? {
                                              animationDelay: `${(unpinnedNewCount - 1 - row.entryIndex) * 75}ms`,
                                          }
                                        : {}),
                                }}
                            >
                                <EntryItem
                                    entry={row.entry}
                                    fieldMapping={fieldMapping}
                                    index={row.globalIndex}
                                    totalCount={totalCount}
                                    selected={!compareMode && selectedIndex === row.globalIndex}
                                    pinned={pinnedHashes.has(hashEntry(row.entry))}
                                    onSelect={
                                        compareMode
                                            ? () => onCompareSelect?.(row.entry)
                                            : () => onSelect?.(row.globalIndex)
                                    }
                                    onTogglePin={onTogglePin && (() => onTogglePin(row.entry))}
                                    isLast={row.entryIndex === unpinnedEntries.length - 1}
                                    compareSelected={
                                        compareMode && compareSelection?.has(hashEntry(row.entry))
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}