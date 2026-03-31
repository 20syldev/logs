import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
    "2": "bg-status-2xx",
    "3": "bg-status-3xx",
    "4": "bg-status-4xx",
    "5": "bg-status-5xx",
};

const methodColors: Record<string, string> = {
    get: "bg-method-get",
    post: "bg-method-post",
    put: "bg-method-put",
    patch: "bg-method-patch",
    delete: "bg-method-delete",
};

interface FieldBadgeProps {
    value: string | number;
    type: "status" | "method" | "category" | string;
}

/**
 * Renders a colored badge for status codes, HTTP methods, or categories.
 * Status badges use color ranges (2xx green, 4xx red, etc.),
 * method badges use per-verb colors, category badges use a neutral border style.
 *
 * @param props.value - The display value (status code number or method/category string)
 * @param props.type - The field type determining the badge color scheme
 */
export default function FieldBadge({ value, type }: FieldBadgeProps) {
    const display = String(value);

    if (type === "status" && typeof value === "number") {
        const prefix = String(value).charAt(0);
        const colorClass = statusColors[prefix] ?? "bg-muted";
        return (
            <span
                className={cn(
                    "inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-white",
                    colorClass
                )}
            >
                {value}
            </span>
        );
    }

    if (type === "method") {
        const colorClass = methodColors[display.toLowerCase()] ?? "bg-muted";
        return (
            <span
                className={cn(
                    "inline-block rounded-full px-3 py-0.5 text-xs font-semibold text-white",
                    colorClass
                )}
            >
                {display}
            </span>
        );
    }

    if (type === "category") {
        return (
            <span className="inline-block rounded-full px-3 py-0.5 text-xs font-medium border text-muted-foreground">
                {display}
            </span>
        );
    }

    // Unknown field type
    return (
        <span className="inline-block rounded-full px-3 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            {display}
        </span>
    );
}