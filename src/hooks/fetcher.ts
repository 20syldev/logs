"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FetchStatus } from "@/data/constants";
import { detectFields } from "@/data/fields";

export type DataEntry = Record<string, unknown>;
export type { FetchStatus };

function extractEntries(raw: unknown): DataEntry[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (item): item is DataEntry =>
                item !== null && typeof item === "object" && !Array.isArray(item)
        );
    }

    if (raw === null || typeof raw !== "object") {
        return [];
    }

    const obj = raw as Record<string, unknown>;
    let best: DataEntry[] | null = null;

    for (const value of Object.values(obj)) {
        if (
            Array.isArray(value) &&
            value.length > (best?.length ?? 0) &&
            value.length > 0 &&
            typeof value[0] === "object" &&
            value[0] !== null &&
            !Array.isArray(value[0])
        ) {
            best = value as DataEntry[];
        }
    }

    return best ?? [obj as DataEntry];
}

interface UseDataFetcherOptions {
    api: string;
    interval?: number;
}

/**
 * Hook that polls an API endpoint at a configurable interval and accumulates new entries.
 * Deduplicates entries by JSON comparison and provides pause/resume/clear controls.
 *
 * @param options - Fetcher configuration
 * @param options.api - The API endpoint URL to poll
 * @param options.interval - Polling interval in milliseconds (default: 2000)
 * @returns Object with entries, connection status, error, and control functions (pause, resume, clear)
 */
export function useDataFetcher({ api, interval = 2000 }: UseDataFetcherOptions) {
    const [entries, setEntries] = useState<DataEntry[]>([]);
    const [status, setStatus] = useState<FetchStatus>("connecting");
    const [error, setError] = useState<string | null>(null);
    const entriesRef = useRef<DataEntry[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const pausedRef = useRef(false);
    const intervalRef = useRef(interval);
    const apiRef = useRef(api);

    useEffect(() => {
        intervalRef.current = interval;
    }, [interval]);

    useEffect(() => {
        apiRef.current = api;
    }, [api]);

    const doFetch = useCallback(async (url: string) => {
        try {
            const response = await fetch(url);
            if (url !== apiRef.current) return;
            const raw = await response.json();
            const data = extractEntries(raw);

            if (!data.length) {
                setStatus("empty");
                return;
            }

            const tsKey = detectFields(data[0]).timestamp;
            if (tsKey) {
                data.sort((a, b) => {
                    const ta = typeof a[tsKey] === "number" ? (a[tsKey] as number) : 0;
                    const tb = typeof b[tsKey] === "number" ? (b[tsKey] as number) : 0;
                    return tb - ta;
                });
            }

            const existing = entriesRef.current;
            const serialized = new Set(existing.map((e) => JSON.stringify(e)));
            const newEntries = data.filter((entry) => !serialized.has(JSON.stringify(entry)));

            if (newEntries.length) {
                const updated = [...newEntries, ...existing];
                entriesRef.current = updated;
                setEntries(updated);
            }

            setStatus("connected");
            setError(null);
        } catch (err) {
            if (url !== apiRef.current) return;
            setStatus("error");
            setError(err instanceof Error ? err.message : "Unknown error");
        }
    }, []);

    useEffect(() => {
        entriesRef.current = [];
        pausedRef.current = false;

        const controller = new AbortController();

        async function init() {
            setEntries([]);
            setStatus("connecting");
            setError(null);

            await doFetch(api);
            if (controller.signal.aborted) return;

            function tick() {
                if (pausedRef.current || controller.signal.aborted || !intervalRef.current) return;
                timeoutRef.current = setTimeout(async () => {
                    if (controller.signal.aborted) return;
                    await doFetch(api);
                    tick();
                }, intervalRef.current);
            }
            tick();
        }

        Promise.resolve().then(init);

        return () => {
            controller.abort();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [api, doFetch]);

    const pause = useCallback(() => {
        pausedRef.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("paused");
    }, []);

    const resume = useCallback(() => {
        pausedRef.current = false;
        setStatus("connected");

        async function restartPolling() {
            await doFetch(apiRef.current);
            function tick() {
                if (pausedRef.current || !intervalRef.current) return;
                timeoutRef.current = setTimeout(async () => {
                    await doFetch(apiRef.current);
                    tick();
                }, intervalRef.current);
            }
            tick();
        }
        restartPolling();
    }, [doFetch]);

    const clear = useCallback(() => {
        entriesRef.current = [];
        setEntries([]);
    }, []);

    return { entries, status, error, pause, resume, clear };
}