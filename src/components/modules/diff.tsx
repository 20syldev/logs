"use client";

import { useMemo } from "react";
import { useTranslations } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReactLenis } from "lenis/react";

type DiffType = "added" | "removed" | "changed" | "unchanged";

interface DiffNode {
    key: string;
    type: DiffType;
    valueA?: unknown;
    valueB?: unknown;
    children?: DiffNode[];
}

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function diffObjects(a: Record<string, unknown>, b: Record<string, unknown>): DiffNode[] {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const nodes: DiffNode[] = [];

    for (const key of allKeys) {
        const inA = key in a;
        const inB = key in b;

        if (inA && !inB) {
            nodes.push({ key, type: "removed", valueA: a[key] });
        } else if (!inA && inB) {
            nodes.push({ key, type: "added", valueB: b[key] });
        } else if (isObject(a[key]) && isObject(b[key])) {
            const children = diffObjects(
                a[key] as Record<string, unknown>,
                b[key] as Record<string, unknown>
            );
            const hasChanges = children.some((c) => c.type !== "unchanged");
            nodes.push({
                key,
                type: hasChanges ? "changed" : "unchanged",
                children,
            });
        } else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
            nodes.push({ key, type: "changed", valueA: a[key], valueB: b[key] });
        } else {
            nodes.push({ key, type: "unchanged", valueA: a[key] });
        }
    }

    return nodes;
}

const typeStyles: Record<DiffType, string> = {
    added: "text-green-600 dark:text-green-400 bg-green-500/10",
    removed: "text-red-600 dark:text-red-400 bg-red-500/10",
    changed: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    unchanged: "text-muted-foreground",
};

const typePrefix: Record<DiffType, string> = {
    added: "+",
    removed: "−",
    changed: "~",
    unchanged: " ",
};

function formatVal(v: unknown): string {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return `"${v}"`;
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

function DiffNodeView({ node, depth = 0 }: { node: DiffNode; depth?: number }) {
    const indent = depth * 16;

    if (node.children) {
        return (
            <div>
                <div
                    className={cn(
                        "flex items-center gap-1.5 py-0.5 px-2 font-mono text-xs",
                        typeStyles[node.type]
                    )}
                    style={{ paddingLeft: indent + 8 }}
                >
                    <span className="w-3 shrink-0 text-center">{typePrefix[node.type]}</span>
                    <span className="font-semibold">{node.key}</span>
                    <span className="text-muted-foreground">{"{"}</span>
                </div>
                {node.children.map((child) => (
                    <DiffNodeView key={child.key} node={child} depth={depth + 1} />
                ))}
                <div
                    className="py-0.5 px-2 font-mono text-xs text-muted-foreground"
                    style={{ paddingLeft: indent + 8 }}
                >
                    <span className="w-3 inline-block" />
                    {"}"}
                </div>
            </div>
        );
    }

    if (node.type === "changed" && node.valueA !== undefined && node.valueB !== undefined) {
        return (
            <div>
                <div
                    className="flex items-center gap-1.5 py-0.5 px-2 font-mono text-xs text-red-600 dark:text-red-400 bg-red-500/10"
                    style={{ paddingLeft: indent + 8 }}
                >
                    <span className="w-3 shrink-0 text-center">−</span>
                    <span className="font-medium">{node.key}:</span>
                    <span className="break-all">{formatVal(node.valueA)}</span>
                </div>
                <div
                    className="flex items-center gap-1.5 py-0.5 px-2 font-mono text-xs text-green-600 dark:text-green-400 bg-green-500/10"
                    style={{ paddingLeft: indent + 8 }}
                >
                    <span className="w-3 shrink-0 text-center">+</span>
                    <span className="font-medium">{node.key}:</span>
                    <span className="break-all">{formatVal(node.valueB)}</span>
                </div>
            </div>
        );
    }

    const value = node.type === "added" ? node.valueB : node.valueA;

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 py-0.5 px-2 font-mono text-xs",
                typeStyles[node.type]
            )}
            style={{ paddingLeft: indent + 8 }}
        >
            <span className="w-3 shrink-0 text-center">{typePrefix[node.type]}</span>
            <span className="font-medium">{node.key}:</span>
            <span className="break-all">{formatVal(value)}</span>
        </div>
    );
}

interface DiffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entryA: Record<string, unknown>;
    entryB: Record<string, unknown>;
}

/**
 * Dialog component showing a diff view between two log entries.
 * Recursively compares fields and displays added, removed, changed, and unchanged values
 * with color-coded indicators (green/red/amber).
 *
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback to toggle open state
 * @param props.entryA - First entry to compare
 * @param props.entryB - Second entry to compare
 */
export default function DiffDialog({ open, onOpenChange, entryA, entryB }: DiffDialogProps) {
    const t = useTranslations("diff");
    const nodes = useMemo(() => diffObjects(entryA, entryB), [entryA, entryB]);

    const stats = useMemo(() => {
        let added = 0,
            removed = 0,
            changed = 0;
        function count(ns: DiffNode[]) {
            for (const n of ns) {
                if (n.type === "added") added++;
                else if (n.type === "removed") removed++;
                else if (n.type === "changed" && !n.children) changed++;
                if (n.children) count(n.children);
            }
        }
        count(nodes);
        return { added, removed, changed };
    }, [nodes]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-lg max-h-[80vh] flex flex-col"
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <div className="flex gap-3 text-xs pt-1">
                        {stats.added > 0 && (
                            <span className="text-green-600 dark:text-green-400">
                                +{stats.added} {t("added")}
                            </span>
                        )}
                        {stats.removed > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                                −{stats.removed} {t("removed")}
                            </span>
                        )}
                        {stats.changed > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                                ~{stats.changed} {t("changed")}
                            </span>
                        )}
                        {stats.added === 0 && stats.removed === 0 && stats.changed === 0 && (
                            <span className="text-muted-foreground">{t("identical")}</span>
                        )}
                    </div>
                </DialogHeader>
                <ReactLenis className="flex-1 overflow-y-auto rounded-md border bg-muted/30">
                    <div className="py-2">
                        {nodes.map((node) => (
                            <DiffNodeView key={node.key} node={node} />
                        ))}
                    </div>
                </ReactLenis>
            </DialogContent>
        </Dialog>
    );
}