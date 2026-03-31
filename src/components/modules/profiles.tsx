"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Check, Copy, Pencil, Plus, Trash2, User } from "lucide-react";
import {
    type Profile,
    type ProfileData,
    restoreProfileData,
    snapshotProfileData,
} from "@/data/profiles";

interface ProfilesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profiles: Profile[];
    activeProfileId: string;
    onProfilesChange: (fn: (prev: Profile[]) => Profile[]) => void;
    onActiveProfileChange: (id: string) => void;
}

/**
 * Dialog for managing user profiles.
 * Supports creating, editing, deleting, and switching between profiles.
 * Each profile stores its own set of settings, filters, endpoints, and presets.
 * Optionally copies current data to a new profile.
 *
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback to toggle open state
 * @param props.profiles - List of all user profiles
 * @param props.activeProfileId - ID of the currently active profile
 * @param props.onProfilesChange - Callback to update the profiles list
 * @param props.onActiveProfileChange - Callback to switch the active profile
 */
export default function ProfilesDialog({
    open,
    onOpenChange,
    profiles,
    activeProfileId,
    onProfilesChange,
    onActiveProfileChange,
}: ProfilesDialogProps) {
    const router = useRouter();
    const t = useTranslations("profile");
    const tc = useTranslations("common");

    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [copyData, setCopyData] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const saveCurrentToActive = () => {
        if (!activeProfileId) return;
        const snapshot = snapshotProfileData();
        onProfilesChange((prev) =>
            prev.map((p) => (p.id === activeProfileId ? { ...p, data: snapshot } : p))
        );
    };

    const switchToProfile = (id: string) => {
        saveCurrentToActive();
        const target = profiles.find((p) => p.id === id);
        restoreProfileData(target?.data);
        onProfilesChange((prev) => prev.map((p) => (p.id === id ? { ...p, data: undefined } : p)));
        onActiveProfileChange(id);
        router.push("/monitor");
    };

    const handleAdd = () => {
        if (!newName.trim()) return;

        const currentData: ProfileData | undefined = copyData ? snapshotProfileData() : undefined;

        saveCurrentToActive();

        const profile: Profile = {
            id: `profile-${Date.now()}`,
            name: newName.trim(),
            description: newDescription.trim(),
        };

        onProfilesChange((prev) => [...prev, profile]);
        restoreProfileData(currentData);
        onActiveProfileChange(profile.id);
        router.push("/monitor");

        setNewName("");
        setNewDescription("");
        setCopyData(false);
        setAdding(false);
    };

    const handleEdit = (id: string) => {
        if (!editName.trim()) return;
        onProfilesChange((prev) =>
            prev.map((p) =>
                p.id === id
                    ? { ...p, name: editName.trim(), description: editDescription.trim() }
                    : p
            )
        );
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (activeProfileId === id) {
            const remaining = profiles.filter((p) => p.id !== id);
            if (remaining.length > 0) {
                const next = remaining[0];
                restoreProfileData(next.data);
                onProfilesChange((prev) =>
                    prev
                        .filter((p) => p.id !== id)
                        .map((p) => (p.id === next.id ? { ...p, data: undefined } : p))
                );
                onActiveProfileChange(next.id);
            } else {
                onProfilesChange((prev) => prev.filter((p) => p.id !== id));
                onActiveProfileChange("");
            }
            router.push("/monitor");
        } else {
            onProfilesChange((prev) => prev.filter((p) => p.id !== id));
        }
        setConfirmDeleteId(null);
    };

    const handleOpenChange = (value: boolean) => {
        onOpenChange(value);
        if (!value) {
            setAdding(false);
            setEditingId(null);
            setConfirmDeleteId(null);
            setCopyData(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("manageProfiles")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                    {profiles.map((profile) => (
                        <div
                            key={profile.id}
                            className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-colors ${
                                profile.id === activeProfileId
                                    ? "border-primary/30"
                                    : "border-border"
                            }`}
                        >
                            {editingId === profile.id ? (
                                <div className="flex-1 space-y-2">
                                    <Input
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder={t("namePlaceholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEdit(profile.id);
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                    />
                                    <Input
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder={t("descriptionPlaceholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleEdit(profile.id);
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => handleEdit(profile.id)}
                                        >
                                            {tc("save")}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setEditingId(null)}
                                        >
                                            {tc("cancel")}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <User className="size-4 shrink-0 text-muted-foreground" />
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => {
                                            if (profile.id !== activeProfileId) {
                                                switchToProfile(profile.id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium truncate">
                                                {profile.name}
                                            </span>
                                            {profile.id === activeProfileId && (
                                                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {t("active")}
                                                </span>
                                            )}
                                        </div>
                                        {profile.description && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {profile.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0 lg:opacity-0 lg:group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-foreground/5"
                                            onClick={() => {
                                                setEditingId(profile.id);
                                                setEditName(profile.name);
                                                setEditDescription(profile.description);
                                            }}
                                        >
                                            <Pencil className="size-3" />
                                        </Button>
                                        {confirmDeleteId === profile.id ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(profile.id)}
                                            >
                                                <Check className="size-3" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-foreground/5"
                                                onClick={() => setConfirmDeleteId(profile.id)}
                                            >
                                                <Trash2 className="size-3" />
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {profiles.length > 0 && adding && <Separator />}

                {adding ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleAdd();
                        }}
                        className="space-y-3"
                    >
                        <Input
                            autoFocus
                            placeholder={t("namePlaceholder")}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <Input
                            placeholder={t("descriptionPlaceholder")}
                            value={newDescription}
                            onChange={(e) => setNewDescription(e.target.value)}
                        />
                        {profiles.length > 0 && (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Copy className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm">{t("copyData")}</span>
                                </div>
                                <Switch checked={copyData} onCheckedChange={setCopyData} />
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                size="sm"
                                className="flex-1"
                                disabled={!newName.trim()}
                            >
                                {tc("add")}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setAdding(false);
                                    setNewName("");
                                    setNewDescription("");
                                    setCopyData(false);
                                }}
                            >
                                {tc("cancel")}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5"
                        onClick={() => setAdding(true)}
                    >
                        <Plus className="size-3.5" />
                        {t("addProfile")}
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}