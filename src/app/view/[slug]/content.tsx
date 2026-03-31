"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import Toolbar from "@/components/layout/toolbar";
import Timeline from "@/components/content/timeline";
import DetailPanel from "@/components/content/detail";
import Selector from "@/components/modules/selector";
import { useDataFetcher } from "@/hooks/fetcher";
import { useTheme } from "@/hooks/theme";
import { hashEntry } from "@/lib/hash";
import { detectFields } from "@/data/fields";
import type { FieldMapping } from "@/data/fields";
import { defaultFilters } from "@/data/presets";
import type { Filters } from "@/data/presets";
import { interval as defaultInterval } from "@/data/constants";
import type { ViewEndpoint, ViewOptions } from "@/data/views";

export default function Content({ config }: { config: ViewOptions }) {
    useTheme();

    const [activeIndex, setActiveIndex] = useState(0);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [selectedHash, setSelectedHash] = useState<string | null>(null);

    const endpoint: ViewEndpoint = config.endpoints[activeIndex];
    const pollingInterval = config.interval ?? defaultInterval;

    const { entries, status, error, pause, resume, clear } = useDataFetcher({
        api: endpoint.url,
        interval: pollingInterval,
    });

    const detectedMapping = useMemo(() => {
        if (entries.length > 0) return detectFields(entries[0]);
        return {};
    }, [entries]);

    useEffect(() => {
        setFieldMapping(detectedMapping);
    }, [detectedMapping]);

    useEffect(() => {
        setSelectedHash(null);
        setFieldMapping({});
    }, [activeIndex]);

    const filteredEntries = useMemo(() => {
        let result = entries;

        if (filters.statuses.length > 0 && fieldMapping.status) {
            result = result.filter((entry) => {
                const val = entry[fieldMapping.status];
                if (typeof val !== "number") return true;
                const prefix = String(val).charAt(0) + "xx";
                return filters.statuses.includes(prefix);
            });
        }

        if (filters.methods.length > 0 && fieldMapping.method) {
            result = result.filter((entry) => {
                const val = entry[fieldMapping.method];
                if (typeof val !== "string") return true;
                return filters.methods.includes(val.toUpperCase());
            });
        }

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter((entry) => JSON.stringify(entry).toLowerCase().includes(q));
        }

        return result;
    }, [entries, filters, fieldMapping]);

    const selectedEntry = useMemo(() => {
        if (!selectedHash) return null;
        return filteredEntries.find((e) => hashEntry(e) === selectedHash) ?? null;
    }, [selectedHash, filteredEntries]);

    const selectedIndex = useMemo(() => {
        if (!selectedEntry) return null;
        return filteredEntries.indexOf(selectedEntry);
    }, [selectedEntry, filteredEntries]);

    const handleSelect = useCallback(
        (index: number) => {
            const entry = filteredEntries[index];
            const hash = hashEntry(entry);
            setSelectedHash((prev) => (prev === hash ? null : hash));
        },
        [filteredEntries]
    );

    const handleClose = useCallback(() => {
        setSelectedHash(null);
    }, []);

    return (
        <div className="flex min-h-dvh">
            <main className="flex-1 flex flex-col min-w-0">
                <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b px-4 h-14 flex items-center gap-3">
                    <span className="text-sm font-medium">{config.title}</span>
                    <Selector
                        endpoints={config.endpoints}
                        activeIndex={activeIndex}
                        onChange={setActiveIndex}
                    />
                </header>

                <div className="sticky top-14 z-30 bg-background/80 backdrop-blur-sm px-4 py-3 border-b">
                    <Toolbar
                        filters={filters}
                        onFiltersChange={setFilters}
                        status={status}
                        totalCount={entries.length}
                        interval={pollingInterval}
                        onIntervalChange={() => {}}
                        onPause={pause}
                        onResume={resume}
                        onClear={clear}
                        logs={filteredEntries}
                    />
                </div>

                <div className="flex-1 p-4">
                    {status === "connecting" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                            <Loader2 className="size-6 animate-spin" />
                            <p className="text-sm">Connecting...</p>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                            <AlertTriangle className="size-6 text-status-4xx" />
                            <p className="text-sm">Failed to fetch data</p>
                            {error && <p className="text-xs">{error}</p>}
                        </div>
                    )}

                    {status !== "connecting" &&
                        status !== "error" &&
                        filteredEntries.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                                <Inbox className="size-6" />
                                <p className="text-sm">No entries yet</p>
                            </div>
                        )}

                    {filteredEntries.length > 0 && (
                        <Timeline
                            pinnedEntries={[]}
                            unpinnedEntries={filteredEntries}
                            pinnedHashes={new Set()}
                            onTogglePin={undefined}
                            autoScroll={true}
                            fieldMapping={fieldMapping}
                            totalCount={entries.length}
                            selectedIndex={selectedIndex ?? undefined}
                            onSelect={handleSelect}
                        />
                    )}
                </div>
            </main>

            {selectedEntry && (
                <DetailPanel
                    entry={selectedEntry}
                    fieldMapping={fieldMapping}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}