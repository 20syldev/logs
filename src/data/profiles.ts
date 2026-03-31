import type { Filters, Preset } from "@/data/presets";
import type { Endpoint, Settings } from "@/data/endpoints";

export interface ProfileData {
    filters?: Filters;
    settings?: Settings;
    endpoints?: Endpoint[];
    lastApi?: string;
    sidebarWidth?: number;
    detailWidth?: number;
    pins?: Record<string, string[]>;
    presets?: Preset[];
}

export interface Profile {
    id: string;
    name: string;
    description: string;
    data?: ProfileData;
}

const PROFILE_KEYS: (keyof ProfileData)[] = [
    "filters",
    "settings",
    "endpoints",
    "lastApi",
    "sidebarWidth",
    "detailWidth",
    "pins",
    "presets",
];

const PREFIX = "flowers:";

/**
 * Captures a snapshot of the current profile's data from localStorage.
 * Reads all profile-related keys (filters, settings, endpoints, etc.) and returns them as an object.
 *
 * @returns A ProfileData object containing all current localStorage values for the profile
 */
export function snapshotProfileData(): ProfileData {
    const data: ProfileData = {};
    for (const key of PROFILE_KEYS) {
        const raw = localStorage.getItem(`${PREFIX}${key}`);
        if (raw) {
            try {
                (data as Record<string, unknown>)[key] = JSON.parse(raw);
            } catch {
                /* skip corrupted keys */
            }
        }
    }
    return data;
}

/**
 * Restores profile data to localStorage, replacing the current state.
 * Clears keys not present in the data and dispatches StorageEvents
 * to notify listening hooks of the changes.
 *
 * @param data - The profile data to restore, or undefined to clear all profile keys
 */
export function restoreProfileData(data: ProfileData | undefined) {
    for (const key of PROFILE_KEYS) {
        const prefixedKey = `${PREFIX}${key}`;
        if (data && key in data) {
            localStorage.setItem(prefixedKey, JSON.stringify(data[key]));
        } else {
            localStorage.removeItem(prefixedKey);
        }
        window.dispatchEvent(
            new StorageEvent("storage", {
                key: prefixedKey,
                newValue: data && key in data ? JSON.stringify(data[key]) : null,
            })
        );
    }
}