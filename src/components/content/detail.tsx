"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "@/i18n/provider";
import { Check, ChevronsDownUp, ChevronsUpDown, Copy, Pin, X } from "lucide-react";
import { ReactLenis } from "lenis/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import FieldBadge from "./field";
import TreeView from "./tree";
import Resize from "../layout/resizer";
import { useLocalStorage } from "@/hooks/storage";
import type { FieldMapping } from "@/data/fields";
import type { ReactNode } from "react";

const urlRegex = /https?:\/\/[^\s"'<>]+/g;

function renderValue(value: unknown): ReactNode {
    const str = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(str)) !== null) {
        if (match.index > lastIndex) {
            parts.push(str.slice(lastIndex, match.index));
        }
        parts.push(
            <a
                key={match.index}
                href={match[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
                onClick={(e) => e.stopPropagation()}
            >
                {match[0]}
            </a>
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < str.length) {
        parts.push(str.slice(lastIndex));
    }

    return parts.length > 0 ? parts : str;
}

interface DetailPanelProps {
    entry: Record<string, unknown>;
    fieldMapping: FieldMapping;
    pinned?: boolean;
    onTogglePin?: () => void;
    onClose: () => void;
}

/**
 * Side panel displaying the full details of a selected log entry.
 * Features resizable width, copy-to-clipboard, pin toggle, and expandable tree view
 * for nested objects.
 *
 * @param props.entry - The log entry object to display
 * @param props.fieldMapping - Mapping of field types to entry keys
 * @param props.pinned - Whether the entry is pinned
 * @param props.onTogglePin - Callback to toggle pin state
 * @param props.onClose - Callback to close the panel
 */
export default function DetailPanel({
    entry,
    fieldMapping,
    pinned,
    onTogglePin,
    onClose,
}: DetailPanelProps) {
    const t = useTranslations("detail");
    const [width, setWidth] = useLocalStorage<number>("detailWidth", 384);

    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [expandKey, setExpandKey] = useState(0);

    const handleResize = useCallback(
        (delta: number) => setWidth((w) => Math.min(600, Math.max(256, w + delta))),
        [setWidth]
    );

    const hasObjects = Object.values(entry).some((v) => v !== null && typeof v === "object");

    const toggleExpand = () => {
        setExpanded((prev) => !prev);
        setExpandKey((k) => k + 1);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const methodVal = fieldMapping.method ? entry[fieldMapping.method] : undefined;
    const statusVal = fieldMapping.status ? entry[fieldMapping.status] : undefined;

    return (
        <aside
            className="relative z-50 border-l bg-card flex flex-col h-dvh sticky top-0 overflow-hidden"
            style={{ width }}
        >
            <Resize side="left" onResize={handleResize} />
            <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {typeof statusVal === "number" && (
                        <FieldBadge value={statusVal} type="status" />
                    )}
                    {typeof methodVal === "string" && (
                        <FieldBadge value={methodVal} type="method" />
                    )}
                    <span className="text-sm font-medium truncate">{t("fallbackTitle")}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {hasObjects && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={toggleExpand}
                        >
                            {expanded ? (
                                <ChevronsDownUp className="size-3.5" />
                            ) : (
                                <ChevronsUpDown className="size-3.5" />
                            )}
                        </Button>
                    )}
                    {onTogglePin && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={onTogglePin}
                        >
                            <Pin
                                className={cn("size-3.5", pinned && "fill-current text-primary")}
                            />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
                        {copied ? (
                            <Check className="size-3.5 text-status-2xx" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            <ReactLenis className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                    {Object.entries(entry).map(([key, value]) => (
                        <div key={key}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                            {value !== null && typeof value === "object" ? (
                                <div className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
                                    <TreeView
                                        key={expandKey}
                                        data={value as Record<string, unknown> | unknown[]}
                                        renderValue={renderValue}
                                        forceExpand={expanded}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm break-all whitespace-pre-wrap">
                                    {renderValue(value)}
                                </p>
                            )}
                            <Separator className="mt-3" />
                        </div>
                    ))}
                </div>
            </ReactLenis>
        </aside>
    );
}