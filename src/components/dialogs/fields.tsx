"use client";

import { useTranslations } from "@/i18n/provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { fieldTypes } from "@/data/fields";
import type { FieldMapping, FieldType } from "@/data/fields";

const AUTO = "__auto__";
const NONE = "__none__";

interface FieldsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sampleKeys: string[];
    detected: FieldMapping;
    overrides: FieldMapping;
    onOverridesChange: (next: FieldMapping) => void;
}

/**
 * Dialog to override the auto-detected field mapping for the current endpoint.
 * For each field type the user keeps "Auto" (detection), picks a key from the
 * data, or sets "None".
 *
 * @param props.sampleKeys - Keys available in the data to map onto field types
 * @param props.detected - The auto-detected mapping, shown next to "Auto"
 * @param props.overrides - Current per-endpoint overrides (empty string = None)
 * @param props.onOverridesChange - Callback with the next overrides object
 */
export default function FieldsDialog({
    open,
    onOpenChange,
    sampleKeys,
    detected,
    overrides,
    onOverridesChange,
}: FieldsDialogProps) {
    const t = useTranslations("fields");

    const valueFor = (type: FieldType) => {
        if (!(type in overrides)) return AUTO;
        return overrides[type] === "" ? NONE : overrides[type];
    };

    const handleChange = (type: FieldType, value: string) => {
        const next = { ...overrides };
        if (value === AUTO) delete next[type];
        else if (value === NONE) next[type] = "";
        else next[type] = value;
        onOverridesChange(next);
    };

    const optionKeys = Array.from(
        new Set([...sampleKeys, ...Object.values(overrides)].filter((key) => key))
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    {fieldTypes.map((type) => (
                        <div key={type} className="flex items-center justify-between gap-3">
                            <label className="text-sm text-muted-foreground">{t(type)}</label>
                            <Select
                                value={valueFor(type)}
                                onValueChange={(value) => handleChange(type, value)}
                            >
                                <SelectTrigger size="sm" className="w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={AUTO}>
                                        {t("auto")}
                                        {detected[type] ? ` · ${detected[type]}` : ""}
                                    </SelectItem>
                                    <SelectItem value={NONE}>{t("none")}</SelectItem>
                                    {optionKeys.map((key) => (
                                        <SelectItem key={key} value={key}>
                                            {key}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}