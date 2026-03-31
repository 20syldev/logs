import type { Endpoint, Settings } from "@/data/endpoints";
import type { Filters, Preset } from "@/data/presets";
import type { Profile } from "@/data/profiles";
import type { Theme } from "@/hooks/theme";

const CURRENT_VERSION = "1";
const PREFIX = "flowers:";

interface TransferPayload {
    v: 1;
    s: Settings;
    f: Filters;
    fav: Endpoint[];
    p: Preset[];
    sw: number;
    dw: number;
    la: string;
    t: Theme;
    pr?: Profile[];
    ap?: string;
}

// --- Base64url helpers (RFC 4648 §5, no padding) ---

function base64urlEncode(bytes: Uint8Array): string {
    const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const binStr = atob(padded);
    return Uint8Array.from(binStr, (c) => c.charCodeAt(0));
}

// --- Compression helpers (deflate-raw via native streams) ---

async function compress(data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(data)])
        .stream()
        .pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array): Promise<string> {
    const stream = new Blob([bytes as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).text();
}

// --- Validation ---

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validatePayload(data: unknown): data is TransferPayload {
    if (!isObject(data)) return false;
    if (data.v !== 1) return false;
    if (!isObject(data.s) || typeof data.s.interval !== "number") return false;
    if (!isObject(data.f) || !Array.isArray(data.f.statuses)) return false;
    if (!Array.isArray(data.fav)) return false;
    if (!Array.isArray(data.p)) return false;
    if (typeof data.t !== "string") return false;
    return true;
}

// --- Read helpers ---

function readStorage<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

// --- Public API ---

const defaultSettings: Settings = {
    interval: 2000,
    autoScroll: true,
    notifications: false,
    sound: false,
};

const defaultFilters: Filters = { statuses: [], methods: [], search: "" };

/**
 * Exports all current app settings from localStorage as a compressed base64url string.
 * Includes filters, endpoints, presets, profiles, theme, and layout dimensions.
 *
 * @returns A versioned, compressed transfer key ready to be shared
 */
export async function exportSettings(): Promise<string> {
    const payload: TransferPayload = {
        v: 1,
        s: readStorage<Settings>("settings", defaultSettings),
        f: readStorage<Filters>("filters", defaultFilters),
        fav: readStorage<Endpoint[]>("endpoints", []),
        p: readStorage<Preset[]>("presets", []),
        sw: readStorage<number>("sidebarWidth", 288),
        dw: readStorage<number>("detailWidth", 384),
        la: readStorage<string>("lastApi", ""),
        t: (localStorage.getItem("theme") as Theme) ?? "system",
        pr: readStorage<Profile[]>("profiles", []),
        ap: readStorage<string>("activeProfile", ""),
    };

    const json = JSON.stringify(payload);
    const compressed = await compress(json);
    return CURRENT_VERSION + base64urlEncode(compressed);
}

/**
 * Decodes and validates a transfer key without applying it.
 * Verifies version compatibility, decompresses the payload, and validates its schema.
 *
 * @param key - The transfer key string to decode
 * @returns The decoded transfer payload for preview
 * @throws Error with code INVALID_FORMAT, UNSUPPORTED_VERSION, CORRUPTED_DATA, or INVALID_SCHEMA
 */
export async function decodePreview(key: string): Promise<TransferPayload> {
    const trimmed = key.trim();
    if (!trimmed) throw new Error("INVALID_FORMAT");

    const version = trimmed[0];
    if (version > CURRENT_VERSION) throw new Error("UNSUPPORTED_VERSION");
    if (version !== CURRENT_VERSION) throw new Error("INVALID_FORMAT");

    let parsed: unknown;
    try {
        const encoded = trimmed.slice(1);
        const bytes = base64urlDecode(encoded);
        const json = await decompress(bytes);
        parsed = JSON.parse(json);
    } catch {
        throw new Error("CORRUPTED_DATA");
    }

    if (!validatePayload(parsed)) throw new Error("INVALID_SCHEMA");
    return parsed;
}

/**
 * Imports settings from a transfer key and persists them to localStorage.
 * Decodes the key, validates its payload, then writes all settings including
 * filters, endpoints, presets, profiles, theme, and layout dimensions.
 *
 * @param key - The transfer key string to import
 * @returns The imported transfer payload
 * @throws Error if the key is invalid or corrupted
 */
export async function importSettings(key: string): Promise<TransferPayload> {
    const payload = await decodePreview(key);

    localStorage.setItem(PREFIX + "settings", JSON.stringify(payload.s));
    localStorage.setItem(PREFIX + "filters", JSON.stringify(payload.f));
    localStorage.setItem(PREFIX + "endpoints", JSON.stringify(payload.fav));
    localStorage.setItem(PREFIX + "presets", JSON.stringify(payload.p));
    localStorage.setItem(PREFIX + "sidebarWidth", JSON.stringify(payload.sw));
    localStorage.setItem(PREFIX + "detailWidth", JSON.stringify(payload.dw));
    localStorage.setItem(PREFIX + "lastApi", JSON.stringify(payload.la));
    localStorage.setItem("theme", payload.t);
    if (payload.pr) localStorage.setItem(PREFIX + "profiles", JSON.stringify(payload.pr));
    if (payload.ap) localStorage.setItem(PREFIX + "activeProfile", JSON.stringify(payload.ap));

    return payload;
}