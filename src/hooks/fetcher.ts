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

function buildHeaders(headers?: { key: string; value: string }[]): HeadersInit | undefined {
    if (!headers?.length) return undefined;
    const entries = headers
        .filter((h) => h.key.trim())
        .map((h) => [h.key.trim(), h.value] as [string, string]);
    return entries.length ? Object.fromEntries(entries) : undefined;
}

interface Scheduler {
    pause(): void;
    resume(): void;
    kick(): void;
    stop(): void;
}

interface UseDataFetcherOptions {
    api: string;
    interval?: number;
    maxEntries?: number;
    headers?: { key: string; value: string }[];
}

/**
 * Hook that polls a JSON endpoint and accumulates new entries newest-first.
 * Deduplicates by JSON comparison, sorts each batch by a detected timestamp,
 * caps the buffer to `maxEntries`, and backs off exponentially on failure.
 * `interval` and `maxEntries` update the running loop live; changing `api`
 * restarts it and clears the entries.
 *
 * @param options.api - The API endpoint URL to poll
 * @param options.interval - Polling interval in ms (default: 2000; 0 = single shot)
 * @param options.maxEntries - Ring-buffer cap; 0 or undefined means unlimited
 * @param options.headers - Request headers sent with every poll
 * @returns Object with entries, status, error, and controls (pause, resume, clear)
 */
export function useDataFetcher({
    api,
    interval = 2000,
    maxEntries,
    headers,
}: UseDataFetcherOptions) {
    const [entries, setEntries] = useState<DataEntry[]>([]);
    const [status, setStatus] = useState<FetchStatus>("connecting");
    const [error, setError] = useState<string | null>(null);

    const entriesRef = useRef<DataEntry[]>([]);
    const failuresRef = useRef(0);
    const pausedRef = useRef(false);
    const schedulerRef = useRef<Scheduler | null>(null);

    const apiRef = useRef(api);
    const intervalRef = useRef(interval);
    const maxEntriesRef = useRef(maxEntries);
    const headersRef = useRef(buildHeaders(headers));

    useEffect(() => {
        const previous = intervalRef.current;
        intervalRef.current = interval;
        if (!previous && interval) schedulerRef.current?.kick();
    }, [interval]);

    useEffect(() => {
        maxEntriesRef.current = maxEntries;
        if (maxEntries && entriesRef.current.length > maxEntries) {
            const capped = entriesRef.current.slice(0, maxEntries);
            entriesRef.current = capped;
            setEntries(capped);
        }
    }, [maxEntries]);

    useEffect(() => {
        headersRef.current = buildHeaders(headers);
    }, [headers]);

    const fetchOnce = useCallback(async (url: string, signal: AbortSignal): Promise<boolean> => {
        try {
            const response = await fetch(url, { signal, headers: headersRef.current });
            const raw = await response.json();
            if (signal.aborted || url !== apiRef.current || pausedRef.current) return true;

            const data = extractEntries(raw);
            if (!data.length) {
                setStatus("empty");
                return true;
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
            const fresh = data.filter((entry) => !serialized.has(JSON.stringify(entry)));

            if (fresh.length) {
                const merged = [...fresh, ...existing];
                const max = maxEntriesRef.current;
                const capped = max ? merged.slice(0, max) : merged;
                entriesRef.current = capped;
                setEntries(capped);
            }

            setStatus("connected");
            setError(null);
            return true;
        } catch (err) {
            if (signal.aborted || url !== apiRef.current || pausedRef.current) return true;
            setStatus("error");
            setError(err instanceof Error ? err.message : "Unknown error");
            return false;
        }
    }, []);

    useEffect(() => {
        apiRef.current = api;
        entriesRef.current = [];
        failuresRef.current = 0;
        pausedRef.current = false;

        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | null = null;
        let running = false;

        function clearTimer() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        }

        function schedule(delay: number) {
            clearTimer();
            if (controller.signal.aborted || pausedRef.current || !delay) return;
            timer = setTimeout(() => {
                timer = null;
                void run();
            }, delay);
        }

        async function run() {
            if (controller.signal.aborted || pausedRef.current || running) return;
            running = true;
            let ok: boolean;
            try {
                ok = await fetchOnce(apiRef.current, controller.signal);
            } finally {
                running = false;
            }
            if (controller.signal.aborted || pausedRef.current) return;

            failuresRef.current = ok ? 0 : failuresRef.current + 1;

            const base = intervalRef.current;
            if (!base) return;

            const delay = ok
                ? base
                : Math.min(base * 2 ** failuresRef.current, Math.max(base, 30000));
            schedule(delay);
        }

        const scheduler: Scheduler = {
            pause() {
                pausedRef.current = true;
                clearTimer();
            },
            resume() {
                if (controller.signal.aborted) return;
                pausedRef.current = false;
                clearTimer();
                void run();
            },
            kick() {
                if (controller.signal.aborted || pausedRef.current || running || timer !== null) {
                    return;
                }
                void run();
            },
            stop() {
                controller.abort();
                clearTimer();
            },
        };
        schedulerRef.current = scheduler;

        setEntries([]);
        setStatus("connecting");
        setError(null);
        void run();

        return () => {
            scheduler.stop();
            if (schedulerRef.current === scheduler) schedulerRef.current = null;
        };
    }, [api, fetchOnce]);

    const pause = useCallback(() => {
        schedulerRef.current?.pause();
        setStatus("paused");
    }, []);

    const resume = useCallback(() => {
        setStatus("connected");
        schedulerRef.current?.resume();
    }, []);

    const clear = useCallback(() => {
        entriesRef.current = [];
        setEntries([]);
    }, []);

    return { entries, status, error, pause, resume, clear };
}