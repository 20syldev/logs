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
import { Separator } from "@/components/ui/separator";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import type { Preset } from "@/data/presets";

interface PresetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preset: Preset;
    currentFilters: { statuses: string[]; methods: string[] };
    currentInterval: number;
    onRename: (id: string, name: string) => void;
    onUpdate: (id: string) => void;
    onDelete: (id: string) => void;
}

function PresetSummary({
    preset,
    currentFilters,
    currentInterval,
}: {
    preset: Preset;
    currentFilters: { statuses: string[]; methods: string[] };
    currentInterval: number;
}) {
    const t = useTranslations("dialogs.editPreset");

    const savedStatuses =
        preset.filters.statuses.length > 0 ? preset.filters.statuses.join(", ") : t("all");
    const savedMethods =
        preset.filters.methods.length > 0 ? preset.filters.methods.join(", ") : t("all");
    const savedInterval =
        preset.interval === undefined
            ? "—"
            : preset.interval === 0
              ? t("never")
              : `${preset.interval / 1000}s`;

    const currentStatuses =
        currentFilters.statuses.length > 0 ? currentFilters.statuses.join(", ") : t("all");
    const currentMethods =
        currentFilters.methods.length > 0 ? currentFilters.methods.join(", ") : t("all");
    const currentIntervalLabel = currentInterval === 0 ? t("never") : `${currentInterval / 1000}s`;

    const rows = [
        { label: t("statuses"), saved: savedStatuses, current: currentStatuses },
        { label: t("methods"), saved: savedMethods, current: currentMethods },
        { label: t("interval"), saved: savedInterval, current: currentIntervalLabel },
    ];

    const hasChanges = rows.some((r) => r.saved !== r.current);

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-xs">
                <span />
                <span className="text-muted-foreground font-medium">{t("saved")}</span>
                <span className="text-muted-foreground font-medium">{t("current")}</span>
                {rows.map((row) => {
                    const changed = row.saved !== row.current;
                    return (
                        <div key={row.label} className="contents">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className={changed ? "text-muted-foreground line-through" : ""}>
                                {row.saved}
                            </span>
                            <span className={changed ? "text-primary font-medium" : ""}>
                                {row.current}
                            </span>
                        </div>
                    );
                })}
            </div>
            {!hasChanges && (
                <p className="text-xs text-muted-foreground italic">{t("noChanges")}</p>
            )}
        </div>
    );
}

/**
 * Dialog for editing a custom preset's name and overwriting its saved values.
 * Shows a side-by-side comparison of saved vs current filters and interval,
 * with rename, overwrite, and delete actions (with shift-click or double-click confirmation).
 *
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback to toggle open state
 * @param props.preset - The preset being edited
 * @param props.currentFilters - The currently active filters for comparison
 * @param props.currentInterval - The current polling interval for comparison
 * @param props.onRename - Callback to rename the preset (id, newName)
 * @param props.onUpdate - Callback to overwrite the preset with current values (id)
 * @param props.onDelete - Callback to delete the preset (id)
 */
export default function PresetDialog({
    open,
    onOpenChange,
    preset,
    currentFilters,
    currentInterval,
    onRename,
    onUpdate,
    onDelete,
}: PresetProps) {
    const t = useTranslations("dialogs.editPreset");
    const tc = useTranslations("common");
    const [name, setName] = useState(preset.name);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [confirmingUpdate, setConfirmingUpdate] = useState(false);

    const handleOpenChange = (value: boolean) => {
        if (value) {
            setName(preset.name);
        }
        setConfirmingDelete(false);
        setConfirmingUpdate(false);
        onOpenChange(value);
    };

    const handleSave = () => {
        if (!name.trim()) return;
        if (name.trim() !== preset.name) {
            onRename(preset.id, name.trim());
        }
        handleOpenChange(false);
    };

    const handleUpdate = (e: React.MouseEvent) => {
        if (e.shiftKey || confirmingUpdate) {
            onUpdate(preset.id);
            handleOpenChange(false);
        } else {
            setConfirmingUpdate(true);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        if (e.shiftKey || confirmingDelete) {
            onDelete(preset.id);
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

                    <Separator />

                    <PresetSummary
                        preset={preset}
                        currentFilters={currentFilters}
                        currentInterval={currentInterval}
                    />

                    <Button variant="outline" size="sm" className="w-full" onClick={handleUpdate}>
                        {confirmingUpdate ? (
                            <Check className="size-3.5 mr-1.5" />
                        ) : (
                            <RefreshCw className="size-3.5 mr-1.5" />
                        )}
                        {confirmingUpdate ? tc("confirmDelete") : t("overwrite")}
                    </Button>
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
                            disabled={!name.trim()}
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