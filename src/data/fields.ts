export type FieldType =
    | "timestamp"
    | "status"
    | "method"
    | "url"
    | "category"
    | "source"
    | "duration"
    | "message";

interface FieldDefinition {
    type: FieldType;
    keywords: string[];
}

export const knownFields: FieldDefinition[] = [
    {
        type: "timestamp",
        keywords: [
            "timestamp",
            "time",
            "date",
            "created",
            "createdat",
            "created_at",
            "updated",
            "updatedat",
            "updated_at",
        ],
    },
    {
        type: "status",
        keywords: ["status", "statuscode", "status_code", "code", "httpstatus", "http_status"],
    },
    {
        type: "method",
        keywords: ["method", "httpmethod", "http_method", "verb", "action"],
    },
    {
        type: "url",
        keywords: ["url", "path", "endpoint", "route", "uri", "request", "href"],
    },
    {
        type: "category",
        keywords: ["type", "category", "kind", "level", "severity", "tag", "label"],
    },
    {
        type: "source",
        keywords: [
            "source",
            "origin",
            "platform",
            "agent",
            "client",
            "user_agent",
            "useragent",
            "from",
            "ip",
        ],
    },
    {
        type: "duration",
        keywords: ["duration", "elapsed", "latency", "responsetime", "response_time", "ms", "took"],
    },
    {
        type: "message",
        keywords: [
            "message",
            "msg",
            "text",
            "description",
            "body",
            "content",
            "error",
            "reason",
            "title",
            "name",
        ],
    },
];

export interface FieldMapping {
    [fieldType: string]: string; // fieldType → actual key name in the JSON
}

/**
 * Auto-detects field type mappings from a sample data entry.
 * Matches entry keys against known keyword lists for each field type
 * (timestamp, status, method, url, category, source, duration, message).
 *
 * @param sample - A representative data entry to analyze
 * @returns Mapping of field types to actual key names in the JSON
 */
export function detectFields(sample: Record<string, unknown>): FieldMapping {
    const mapping: FieldMapping = {};
    const usedKeys = new Set<string>();

    for (const field of knownFields) {
        for (const key of Object.keys(sample)) {
            if (usedKeys.has(key)) continue;
            if (field.keywords.includes(key.toLowerCase())) {
                mapping[field.type] = key;
                usedKeys.add(key);
                break;
            }
        }
    }

    return mapping;
}

/**
 * Extracts all fields from an entry that are not covered by the field mapping.
 * Useful for displaying additional metadata that doesn't match known field types.
 *
 * @param entry - The data entry to extract from
 * @param mapping - The current field type mapping
 * @returns Object containing only the unmapped key-value pairs
 */
export function getExtraFields(
    entry: Record<string, unknown>,
    mapping: FieldMapping
): Record<string, unknown> {
    const mappedKeys = new Set(Object.values(mapping));
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
        if (!mappedKeys.has(key)) {
            extras[key] = value;
        }
    }
    return extras;
}

/**
 * Returns the Tailwind background class for an HTTP status code.
 * Maps status ranges: 2xx (success), 3xx (redirect), 4xx (client error), 5xx (server error).
 *
 * @param status - The HTTP status code
 * @returns Tailwind CSS class string (e.g. "bg-status-2xx")
 */
export function getStatusColor(status: number): string {
    if (status < 300) return "bg-status-2xx";
    if (status < 400) return "bg-status-3xx";
    if (status < 500) return "bg-status-4xx";
    return "bg-status-5xx";
}

// Method colors
const methodColors: Record<string, string> = {
    get: "bg-method-get",
    post: "bg-method-post",
    put: "bg-method-put",
    patch: "bg-method-patch",
    delete: "bg-method-delete",
};

/**
 * Returns the Tailwind background class for an HTTP method.
 * Supports GET, POST, PUT, PATCH, DELETE with distinct colors.
 *
 * @param method - The HTTP method string (case-insensitive)
 * @returns Tailwind CSS class string (e.g. "bg-method-get")
 */
export function getMethodColor(method: string): string {
    return methodColors[method.toLowerCase()] ?? "bg-muted";
}