"use client";

import { memo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TreeViewProps {
    data: Record<string, unknown> | unknown[];
    renderValue: (value: unknown) => ReactNode;
    defaultExpandDepth?: number;
    forceExpand?: boolean;
}

interface TreeNodeProps {
    label: string;
    value: unknown;
    isLast: boolean;
    depth: number;
    defaultExpandDepth: number;
    renderValue: (value: unknown) => ReactNode;
}

function isExpandable(value: unknown): value is Record<string, unknown> | unknown[] {
    return value !== null && typeof value === "object";
}

function summary(value: Record<string, unknown> | unknown[]): string {
    if (Array.isArray(value)) {
        return value.length === 0 ? "[]" : `[${value.length}]`;
    }
    const keys = Object.keys(value);
    return keys.length === 0 ? "{}" : `{${keys.length}}`;
}

function isEmpty(value: Record<string, unknown> | unknown[]): boolean {
    return Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0;
}

function valueClass(value: unknown): string {
    if (value === null || value === undefined) return "text-muted-foreground italic";
    if (typeof value === "string") return "text-green-600 dark:text-green-400";
    if (typeof value === "number") return "text-blue-600 dark:text-blue-400";
    if (typeof value === "boolean") return "text-amber-600 dark:text-amber-400";
    return "";
}

function formatValue(value: unknown, renderValue: (v: unknown) => ReactNode): ReactNode {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        const rendered = renderValue(value);
        if (rendered !== value) return <>&quot;{rendered}&quot;</>;
        return `"${value}"`;
    }
    return String(value);
}

const TreeNode = memo(function TreeNode({
    label,
    value,
    isLast,
    depth,
    defaultExpandDepth,
    renderValue,
}: TreeNodeProps) {
    const expandable = isExpandable(value);
    const empty = expandable && isEmpty(value);
    const [expanded, setExpanded] = useState(depth < defaultExpandDepth && !empty);

    const entries =
        expandable && !empty
            ? Array.isArray(value)
                ? value.map((v, i) => [String(i), v] as const)
                : (Object.entries(value) as [string, unknown][])
            : [];

    return (
        <div className={cn("relative", depth > 0 && "pl-5")}>
            {/* Vertical line (non-last only) */}
            {depth > 0 && !isLast && (
                <div className="absolute left-1 top-0 bottom-0 w-[2px] bg-border" />
            )}
            {/* Horizontal stub (non-last) */}
            {depth > 0 && !isLast && (
                <div className="absolute left-1 top-[9px] h-[2px] w-3 bg-border" />
            )}
            {/* Rounded corner (last item) */}
            {depth > 0 && isLast && (
                <div
                    className="absolute left-1 top-0 w-3 border-l-[2.5px] border-b-[2.5px] border-border rounded-bl-[4px]"
                    style={{ height: 10 }}
                />
            )}

            {/* Content */}
            <div className="flex items-center gap-1.5 py-0.5 min-w-0">
                {expandable && !empty ? (
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="flex items-center gap-1.5 min-w-0 group/chevron"
                    >
                        <ChevronRight
                            className={cn(
                                "size-2.5 shrink-0 text-muted-foreground group-hover/chevron:text-foreground transition-all duration-150",
                                expanded && "rotate-90"
                            )}
                        />
                        <span className="font-medium text-foreground">{label}</span>
                        {!expanded && (
                            <span className="text-muted-foreground ml-1">{summary(value)}</span>
                        )}
                    </button>
                ) : (
                    <>
                        <span className="font-medium text-foreground ml-1">{label}</span>
                        {expandable && empty ? (
                            <span className="text-muted-foreground">
                                {Array.isArray(value) ? "[]" : "{}"}
                            </span>
                        ) : (
                            <>
                                <span className="text-muted-foreground">:</span>
                                <span className={cn("break-all", valueClass(value))}>
                                    {formatValue(value, renderValue)}
                                </span>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Children */}
            {expandable &&
                expanded &&
                entries.length > 0 &&
                entries.map(([key, val], i) => (
                    <TreeNode
                        key={key}
                        label={key}
                        value={val}
                        isLast={i === entries.length - 1}
                        depth={depth + 1}
                        defaultExpandDepth={defaultExpandDepth}
                        renderValue={renderValue}
                    />
                ))}
        </div>
    );
});

/**
 * Recursive tree viewer component for displaying nested JSON data.
 * Renders expandable/collapsible nodes with syntax-colored values,
 * branch connector lines, and configurable default expand depth.
 *
 * @param props.data - The object or array to render as a tree
 * @param props.renderValue - Custom renderer for leaf values (e.g. to linkify URLs)
 * @param props.defaultExpandDepth - How many levels to auto-expand (default: 2)
 * @param props.forceExpand - Override to force all nodes expanded (true) or collapsed (false)
 */
export default function TreeView({
    data,
    renderValue,
    defaultExpandDepth = 2,
    forceExpand,
}: TreeViewProps) {
    const effectiveDepth = forceExpand !== undefined ? (forceExpand ? 999 : 0) : defaultExpandDepth;
    const entries = Array.isArray(data)
        ? data.map((v, i) => [String(i), v] as const)
        : (Object.entries(data) as [string, unknown][]);

    return (
        <div className="font-mono">
            {entries.map(([key, value], i) => (
                <TreeNode
                    key={key}
                    label={key}
                    value={value}
                    isLast={i === entries.length - 1}
                    depth={0}
                    defaultExpandDepth={effectiveDepth}
                    renderValue={renderValue}
                />
            ))}
        </div>
    );
}