export interface Filters {
    statuses: string[];
    methods: string[];
    search: string;
}

export interface Preset {
    id: string;
    name: string;
    builtin: boolean;
    filters: Filters;
    interval?: number;
}

export const builtinPresets: Preset[] = [
    { id: "all", name: "All", builtin: true, filters: { statuses: [], methods: [], search: "" } },
    {
        id: "errors",
        name: "Errors",
        builtin: true,
        filters: { statuses: ["4xx", "5xx"], methods: [], search: "" },
    },
    {
        id: "writes",
        name: "Writes",
        builtin: true,
        filters: { statuses: [], methods: ["POST", "PUT", "PATCH", "DELETE"], search: "" },
    },
    {
        id: "reads",
        name: "Reads",
        builtin: true,
        filters: { statuses: [], methods: ["GET"], search: "" },
    },
];

export const defaultFilters: Filters = { statuses: [], methods: [], search: "" };

/**
 * Checks whether two filter objects are equivalent.
 * Compares search string, statuses, and methods arrays regardless of order.
 *
 * @param a - First filter set
 * @param b - Second filter set
 * @returns True if both filters have the same search, statuses, and methods
 */
export function filtersMatch(a: Filters, b: Filters): boolean {
    return (
        a.search === b.search &&
        a.statuses.length === b.statuses.length &&
        a.methods.length === b.methods.length &&
        a.statuses.every((s) => b.statuses.includes(s)) &&
        a.methods.every((m) => b.methods.includes(m))
    );
}

export interface PresetContext {
    filters: Filters;
    interval?: number;
}

/**
 * Checks whether a preset matches the current filter and interval context.
 * A preset matches if its filters are equivalent and its interval (if defined) matches.
 *
 * @param preset - The preset to check
 * @param ctx - The current filters and interval context
 * @returns True if the preset matches the current context
 */
export function presetMatch(preset: Preset, ctx: PresetContext): boolean {
    if (!filtersMatch(preset.filters, ctx.filters)) return false;
    if (preset.interval !== undefined && preset.interval !== ctx.interval) return false;
    return true;
}