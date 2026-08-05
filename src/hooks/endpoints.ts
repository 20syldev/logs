"use client";

import { useCallback } from "react";

import { useLocalStorage } from "@/hooks/storage";
import type { FieldMapping } from "@/data/fields";

/**
 * Copies a URL-keyed map without the given URLs.
 *
 * @param map - The map to filter
 * @param urls - The URLs to leave out
 * @returns A new map holding every other entry
 */
function without<T>(map: Record<string, T>, ...urls: string[]): Record<string, T> {
    return Object.fromEntries(Object.entries(map).filter(([key]) => !urls.includes(key)));
}

/**
 * Hook keeping the per-URL stores in sync with the endpoint they belong to.
 * Pins and field mapping overrides are keyed by endpoint URL, so editing or
 * deleting an endpoint has to move or drop those entries too — otherwise the
 * endpoint silently loses them and the stores keep orphaned keys forever.
 *
 * @returns Callbacks to move the stored entries to another URL, or drop them
 */
export function useEndpointKeys() {
    const [, setPins] = useLocalStorage<Record<string, string[]>>("pins", {});
    const [, setMappings] = useLocalStorage<Record<string, FieldMapping>>("mappings", {});

    const moveKeys = useCallback(
        (from: string, to: string) => {
            if (from === to) return;
            const move = <T>(map: Record<string, T>) =>
                from in map ? { ...without(map, from, to), [to]: map[from] } : map;
            setPins(move);
            setMappings(move);
        },
        [setPins, setMappings]
    );

    const dropKeys = useCallback(
        (url: string) => {
            setPins((prev) => without(prev, url));
            setMappings((prev) => without(prev, url));
        },
        [setPins, setMappings]
    );

    return { moveKeys, dropKeys };
}