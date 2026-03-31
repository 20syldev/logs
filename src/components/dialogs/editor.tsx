"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Check, Trash2 } from "lucide-react";
import type { Endpoint, SavedViewState } from "@/data/endpoints";

interface EditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    endpoint: Endpoint;
    currentState: SavedViewState;
    onSave: (updated: Endpoint) => void;
    onDelete: () => void;
}

function StateSummary({ state }: { state: SavedViewState }) {
    const t = useTranslations("dialogs.editEndpoint");

    const items: string[] = [];

    if (state.filters) {
        const parts: string[] = [];
        if (state.filters.statuses.length > 0) parts.push(state.filters.statuses.join(", "));
        if (state.filters.methods.length > 0) parts.push(state.filters.methods.join(", "));
        if (state.filters.search) parts.push(`"${state.filters.search}"`);
        if (parts.length > 0) items.push(`${t("filters")} ${parts.join(" · ")}`);
        else items.push(`${t("filters")} ${t("filtersAll")}`);
    }

    if (state.settings) {
        const intervalLabel =
            state.settings.interval === 0 ? t("never") : `${state.settings.interval / 1000}s`;
        items.push(`${t("interval")} ${intervalLabel}`);
    }

    if (state.sidebarWidth || state.detailWidth) {
        const widths: string[] = [];
        if (state.sidebarWidth) widths.push(`${t("sidebar")} ${state.sidebarWidth}px`);
        if (state.detailWidth) widths.push(`${t("detail")} ${state.detailWidth}px`);
        items.push(`${t("panels")} ${widths.join(", ")}`);
    }

    return (
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            {items.map((item) => (
                <p key={item} className="text-xs text-muted-foreground">
                    {item}
                </p>
            ))}
        </div>
    );
}

/**
 * Dialog for editing an endpoint's name, URL, and saved state toggle.
 * Displays a summary of the saved view state (filters, interval, panel widths)
 * and provides save and delete actions with confirmation.
 *
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback to toggle open state
 * @param props.endpoint - The endpoint being edited
 * @param props.currentState - The current view state to snapshot when toggling "remember"
 * @param props.onSave - Callback with the updated endpoint
 * @param props.onDelete - Callback to delete the endpoint
 */
export default function EditorDialog({
    open,
    onOpenChange,
    endpoint,
    currentState,
    onSave,
    onDelete,
}: EditorDialogProps) {
    const t = useTranslations("dialogs.editEndpoint");
    const tc = useTranslations("common");
    const [name, setName] = useState(endpoint.name);
    const [url, setUrl] = useState(endpoint.url);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const rememberState = !!endpoint.savedState;

    const handleOpenChange = (value: boolean) => {
        if (value) {
            setName(endpoint.name);
            setUrl(endpoint.url);
        }
        setConfirmingDelete(false);
        onOpenChange(value);
    };

    const handleToggleRemember = (checked: boolean) => {
        onSave({
            ...endpoint,
            savedState: checked ? { ...currentState } : undefined,
        });
    };

    const handleSave = () => {
        if (!name.trim() || !url.trim()) return;
        onSave({
            url: url.trim(),
            name: name.trim(),
            savedState: endpoint.savedState,
        });
        handleOpenChange(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        if (e.shiftKey || confirmingDelete) {
            onDelete();
            handleOpenChange(false);
        } else {
            setConfirmingDelete(true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">{tc("name")}</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">{tc("url")}</label>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={t("urlPlaceholder")}
                        />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">{t("rememberState")}</p>
                            <p className="text-xs text-muted-foreground">
                                {t("rememberStateDescription")}
                            </p>
                        </div>
                        <Switch checked={rememberState} onCheckedChange={handleToggleRemember} />
                    </div>

                    <div
                        className="grid transition-[grid-template-rows] duration-200 ease-out"
                        style={{
                            gridTemplateRows: endpoint.savedState ? "1fr" : "0fr",
                        }}
                    >
                        <div className="overflow-hidden min-h-0">
                            {endpoint.savedState && <StateSummary state={endpoint.savedState} />}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex gap-2 sm:order-2 sm:ml-auto">
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => onOpenChange(false)}
                        >
                            {tc("cancel")}
                        </Button>
                        <Button
                            className="flex-1 sm:flex-none"
                            onClick={handleSave}
                            disabled={!name.trim() || !url.trim()}
                        >
                            {tc("save")}
                        </Button>
                    </div>
                    <Button
                        variant={confirmingDelete ? "default" : "destructive"}
                        className={`sm:order-1 ${confirmingDelete ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                        onClick={handleDelete}
                    >
                        {confirmingDelete ? (
                            <Check className="size-3.5 mr-1.5" />
                        ) : (
                            <Trash2 className="size-3.5 mr-1.5" />
                        )}
                        {confirmingDelete ? tc("confirmDelete") : tc("delete")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}