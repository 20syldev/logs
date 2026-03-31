"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "@/i18n/provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Check, Copy, Download, Upload } from "lucide-react";
import { decodePreview, exportSettings, importSettings } from "@/lib/transfer";

type Mode = "export" | "import";

interface PreviewData {
    filters: string;
    interval: string;
    endpoints: string;
    presets: string;
    profiles: string;
    theme: string;
}

function buildPreview(
    payload: Awaited<ReturnType<typeof decodePreview>>,
    t: (key: string, params?: Record<string, string | number>) => string
): PreviewData {
    const filterParts: string[] = [];
    if (payload.f.statuses.length > 0) filterParts.push(payload.f.statuses.join(", "));
    if (payload.f.methods.length > 0) filterParts.push(payload.f.methods.join(", "));
    if (payload.f.search) filterParts.push(`"${payload.f.search}"`);

    return {
        filters: filterParts.length > 0 ? filterParts.join(" · ") : t("all"),
        interval: payload.s.interval === 0 ? t("never") : `${payload.s.interval / 1000}s`,
        endpoints:
            payload.fav.length > 0 ? t("savedCount", { count: payload.fav.length }) : t("none"),
        presets: payload.p.length > 0 ? t("customCount", { count: payload.p.length }) : t("none"),
        profiles:
            payload.pr && payload.pr.length > 0
                ? t("savedCount", { count: payload.pr.length })
                : t("none"),
        theme: payload.t,
    };
}

/**
 * Dialog for exporting and importing app settings as compressed transfer keys.
 * Export mode generates a shareable string, import mode decodes and previews
 * the settings before applying them with a page reload.
 */
export default function TransferDialog() {
    const t = useTranslations("transfer");
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<Mode>("export");
    const [exportKey, setExportKey] = useState("");
    const [importKey, setImportKey] = useState("");
    const [copied, setCopied] = useState(false);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const getErrorMessage = (code: string) => {
        const messages: Record<string, string> = {
            INVALID_FORMAT: t("errorInvalidFormat"),
            UNSUPPORTED_VERSION: t("errorUnsupportedVersion"),
            CORRUPTED_DATA: t("errorCorruptedData"),
            INVALID_SCHEMA: t("errorInvalidSchema"),
        };
        return messages[code] ?? t("errorUnknown");
    };

    const generateExportKey = useCallback(() => {
        setLoading(true);
        exportSettings()
            .then(setExportKey)
            .finally(() => setLoading(false));
    }, []);

    const handleImportKeyChange = (value: string) => {
        setImportKey(value);
        setPreview(null);
        setError("");
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) return;

        debounceRef.current = setTimeout(() => {
            decodePreview(value)
                .then((payload) => {
                    setPreview(buildPreview(payload, t));
                    setError("");
                })
                .catch((err: Error) => {
                    setPreview(null);
                    setError(getErrorMessage(err.message));
                });
        }, 300);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(exportKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApply = async () => {
        try {
            await importSettings(importKey);
            window.location.reload();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(getErrorMessage(message));
        }
    };

    const handleOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) {
            generateExportKey();
        } else {
            setExportKey("");
            setImportKey("");
            setPreview(null);
            setError("");
            setCopied(false);
            setMode("export");
        }
    };

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        if (newMode === "export") generateExportKey();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ArrowLeftRight className="size-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="flex gap-2">
                    <Button
                        variant={mode === "export" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleModeChange("export")}
                    >
                        <Download className="size-3.5" />
                        {t("export")}
                    </Button>
                    <Button
                        variant={mode === "import" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleModeChange("import")}
                    >
                        <Upload className="size-3.5" />
                        {t("import")}
                    </Button>
                </div>

                {mode === "export" && (
                    <div className="space-y-3">
                        <textarea
                            className="w-full max-h-40 rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-none break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring field-sizing-content"
                            readOnly
                            value={loading ? t("generating") : exportKey}
                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                        <Button
                            size="sm"
                            className="w-full gap-1.5"
                            onClick={handleCopy}
                            disabled={!exportKey || loading}
                        >
                            {copied ? (
                                <>
                                    <Check className="size-3.5" />
                                    {t("copied")}
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3.5" />
                                    {t("copyToClipboard")}
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {mode === "import" && (
                    <div className="space-y-3">
                        <textarea
                            className="w-full min-h-20 rounded-md border bg-transparent px-3 py-2 text-xs font-mono resize-none break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring field-sizing-content"
                            placeholder={t("pastePlaceholder")}
                            value={importKey}
                            onChange={(e) => handleImportKeyChange(e.target.value)}
                        />

                        {error && <p className="text-xs text-destructive">{error}</p>}

                        {preview && (
                            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    {t("filters")} {preview.filters}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("interval")} {preview.interval}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("theme")} {preview.theme}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("endpoints")} {preview.endpoints}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("presets")} {preview.presets}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("profiles")} {preview.profiles}
                                </p>
                            </div>
                        )}

                        <Button
                            size="sm"
                            className="w-full"
                            onClick={handleApply}
                            disabled={!preview}
                        >
                            {t("apply")}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}