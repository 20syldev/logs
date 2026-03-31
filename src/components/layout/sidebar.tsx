"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/i18n/provider";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "radix-ui";
import { ReactLenis } from "lenis/react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronsUpDown, Link2, Menu, Plus, Settings2, User, UserPlus, Zap } from "lucide-react";
import Resize from "./resizer";
import Stats from "../modules/stats";
import TransferDialog from "../modules/transfer";
import ProfilesDialog from "../modules/profiles";
import EditorDialog from "../dialogs/editor";
import PresetDialog from "../dialogs/preset";
import { useLocalStorage } from "@/hooks/storage";
import { builtinPresets, type Filters, type Preset, presetMatch } from "@/data/presets";
import type { Profile } from "@/data/profiles";
import type { DataEntry } from "@/hooks/fetcher";
import type { Endpoint, SavedViewState, Settings } from "@/data/endpoints";

interface SidebarProps {
    currentApi: string;
    endpoints: Endpoint[];
    onEndpointsChange: (fn: (prev: Endpoint[]) => Endpoint[]) => void;
    filters: Filters;
    onFiltersChange: (filters: Filters) => void;
    settings: Settings;
    onSettingsChange: (settings: Settings) => void;
    logs: DataEntry[];
}

const presetNameKeys: Record<string, string> = {
    all: "presetAll",
    errors: "presetErrors",
    writes: "presetWrites",
    reads: "presetReads",
};

function SidebarContent({
    currentApi,
    endpoints,
    onEndpointsChange,
    filters,
    onFiltersChange,
    settings,
    onSettingsChange,
    logs,
}: SidebarProps) {
    const router = useRouter();
    const t = useTranslations("sidebar");
    const tc = useTranslations("common");

    const [customPresets, setCustomPresets] = useLocalStorage<Preset[]>("presets", []);
    const [sidebarWidth] = useLocalStorage<number>("sidebarWidth", 288);
    const [detailWidth] = useLocalStorage<number>("detailWidth", 384);
    const [, setLastApi] = useLocalStorage<string>("lastApi", "");

    const [newPresetName, setNewPresetName] = useState("");
    const [presetDialogOpen, setPresetDialogOpen] = useState(false);
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addUrl, setAddUrl] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    const [editingPresetName, setEditingPresetName] = useState("");
    const [presetOpen, setPresetOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

    const allPresets = [...builtinPresets, ...customPresets];

    const currentState: SavedViewState = {
        filters,
        settings,
        sidebarWidth,
        detailWidth,
    };

    const handleAddEndpoint = () => {
        const url = addUrl.trim();
        if (!url) return;
        const alreadyExists = endpoints.some((f) => f.url === url);
        if (!alreadyExists) {
            let name: string;
            try {
                name = new URL(url).hostname;
            } catch {
                name = url;
            }
            onEndpointsChange((prev) => [...prev, { url, name, savedState: { ...currentState } }]);
        }
        setLastApi(url);
        router.push(`/monitor?api=${encodeURIComponent(url)}`);
        setAddUrl("");
        setAddDialogOpen(false);
    };

    const handleEditEndpoint = (updated: Endpoint) => {
        if (!editingEndpoint) return;
        onEndpointsChange((prev) => prev.map((f) => (f.url === editingEndpoint.url ? updated : f)));
        setEditingEndpoint(updated);
    };

    const handleDeleteEndpoint = () => {
        if (!editingEndpoint) return;
        onEndpointsChange((prev) => prev.filter((f) => f.url !== editingEndpoint.url));
        setEditingEndpoint(null);
    };

    const handleEndpointClick = (ep: Endpoint) => {
        if (ep.savedState) {
            if (ep.savedState.filters) onFiltersChange(ep.savedState.filters);
            if (ep.savedState.settings) onSettingsChange(ep.savedState.settings);
        }
        setLastApi(ep.url);
        router.push(`/monitor?api=${encodeURIComponent(ep.url)}`);
    };

    const renameEndpoint = (url: string, newName: string) => {
        if (!newName.trim()) return;
        onEndpointsChange((prev) =>
            prev.map((f) => (f.url === url ? { ...f, name: newName.trim() } : f))
        );
        setEditingUrl(null);
    };

    const savePreset = () => {
        if (!newPresetName.trim()) return;
        const preset: Preset = {
            id: `custom-${Date.now()}`,
            name: newPresetName.trim(),
            builtin: false,
            filters: { ...filters },
            interval: settings.interval,
        };
        setCustomPresets((prev) => [...prev, preset]);
        setNewPresetName("");
        setPresetDialogOpen(false);
    };

    const deletePreset = (id: string) => {
        setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    };

    const renamePreset = (id: string, newName: string) => {
        if (!newName.trim()) return;
        setCustomPresets((prev) =>
            prev.map((p) => (p.id === id ? { ...p, name: newName.trim() } : p))
        );
        setEditingPresetId(null);
    };

    const updatePreset = (id: string) => {
        setCustomPresets((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, filters: { ...filters }, interval: settings.interval } : p
            )
        );
    };

    const applyPreset = (preset: Preset) => {
        onFiltersChange(preset.filters);
        if (preset.interval !== undefined)
            onSettingsChange({ ...settings, interval: preset.interval });
    };

    const activePreset = allPresets.find((p) =>
        presetMatch(p, { filters, interval: settings.interval })
    );

    return (
        <div className="space-y-6">
            {/* Endpoints */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{t("endpoints")}</h3>
                    <div className="flex items-center gap-1">
                        <TransferDialog />
                        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Plus className="size-3.5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent aria-describedby={undefined}>
                                <DialogHeader>
                                    <DialogTitle>{t("connectDialog")}</DialogTitle>
                                </DialogHeader>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleAddEndpoint();
                                    }}
                                    className="flex flex-col gap-3"
                                >
                                    <div className="relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                        <Input
                                            type="url"
                                            placeholder={t("endpointPlaceholder")}
                                            value={addUrl}
                                            onChange={(e) => setAddUrl(e.target.value)}
                                            className="pl-9"
                                            autoFocus
                                        />
                                    </div>
                                    <Button type="submit" size="sm" disabled={!addUrl.trim()}>
                                        {tc("add")}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                {endpoints.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("noEndpoints")}</p>
                )}
                {endpoints.map((ep) => (
                    <div
                        key={ep.url}
                        className={`group flex items-center gap-2 border-1 border-dashed rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${ep.url === currentApi ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                        onClick={() => handleEndpointClick(ep)}
                    >
                        <div className="min-w-0 flex-1">
                            {editingUrl === ep.url ? (
                                <input
                                    autoFocus
                                    className="w-full bg-transparent text-sm font-medium outline-none border-b border-border"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => renameEndpoint(ep.url, editingName)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") renameEndpoint(ep.url, editingName);
                                        if (e.key === "Escape") setEditingUrl(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <div
                                    className="font-medium truncate cursor-text"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingUrl(ep.url);
                                        setEditingName(ep.name);
                                    }}
                                >
                                    {ep.name}
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground truncate">{ep.url}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-foreground/5"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingEndpoint(ep);
                                setEditDialogOpen(true);
                            }}
                        >
                            <Settings2 className="size-3" />
                        </Button>
                    </div>
                ))}
            </section>

            {editingEndpoint && (
                <EditorDialog
                    open={editDialogOpen}
                    onOpenChange={(v) => {
                        setEditDialogOpen(v);
                        if (!v) setEditingEndpoint(null);
                    }}
                    endpoint={editingEndpoint}
                    currentState={currentState}
                    onSave={handleEditEndpoint}
                    onDelete={handleDeleteEndpoint}
                />
            )}

            {editingPreset && (
                <PresetDialog
                    open={presetOpen}
                    onOpenChange={setPresetOpen}
                    preset={editingPreset}
                    currentFilters={filters}
                    currentInterval={settings.interval}
                    onRename={renamePreset}
                    onUpdate={updatePreset}
                    onDelete={deletePreset}
                />
            )}

            <Separator />

            {/* Presets */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{t("presets")}</h3>
                    <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Plus className="size-3.5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent aria-describedby={undefined}>
                            <DialogHeader>
                                <DialogTitle>{t("presetDialog")}</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    savePreset();
                                }}
                                className="flex flex-col gap-3"
                            >
                                <Input
                                    placeholder={t("presetPlaceholder")}
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    autoFocus
                                />
                                <Button type="submit" size="sm" disabled={!newPresetName.trim()}>
                                    {tc("save")}
                                </Button>
                            </form>
                            <div className="text-xs text-muted-foreground space-y-1 pt-1">
                                <p className="font-medium">{t("presetSaving")}</p>
                                <p>
                                    {t("presetStatuses")}{" "}
                                    {filters.statuses.length > 0
                                        ? filters.statuses.join(", ")
                                        : t("presetAll")}
                                </p>
                                <p>
                                    {t("presetMethods")}{" "}
                                    {filters.methods.length > 0
                                        ? filters.methods.join(", ")
                                        : t("presetAll")}
                                </p>
                                <p>
                                    {t("presetInterval")}{" "}
                                    {settings.interval === 0
                                        ? t("never")
                                        : `${settings.interval / 1000}s`}
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="space-y-1">
                    {allPresets.map((preset) => (
                        <div
                            key={preset.id}
                            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${activePreset?.id === preset.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                            onClick={() => applyPreset(preset)}
                        >
                            <Zap
                                className={`size-3 shrink-0 ${activePreset?.id === preset.id ? "text-primary" : "text-muted-foreground"}`}
                            />
                            {!preset.builtin && editingPresetId === preset.id ? (
                                <input
                                    autoFocus
                                    className="flex-1 bg-transparent text-sm outline-none border-b border-border"
                                    value={editingPresetName}
                                    onChange={(e) => setEditingPresetName(e.target.value)}
                                    onBlur={() => renamePreset(preset.id, editingPresetName)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                            renamePreset(preset.id, editingPresetName);
                                        if (e.key === "Escape") setEditingPresetId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="flex-1"
                                    onClick={
                                        !preset.builtin
                                            ? (e) => {
                                                  e.stopPropagation();
                                                  setEditingPresetId(preset.id);
                                                  setEditingPresetName(preset.name);
                                              }
                                            : undefined
                                    }
                                >
                                    {preset.builtin && presetNameKeys[preset.id]
                                        ? t(presetNameKeys[preset.id])
                                        : preset.name}
                                </span>
                            )}
                            {!preset.builtin && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-foreground/5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingPreset(preset);
                                        setPresetOpen(true);
                                    }}
                                >
                                    <Settings2 className="size-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {logs.length > 0 && (
                <>
                    <Separator />

                    {/* Stats */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-medium">{t("stats")}</h3>
                        <Stats logs={logs} />
                    </section>
                </>
            )}
        </div>
    );
}

function ProfileSection() {
    const t = useTranslations("profile");
    const [profiles, setProfiles] = useLocalStorage<Profile[]>("profiles", []);
    const [activeProfileId, setActiveProfileId] = useLocalStorage<string>("activeProfile", "");
    const [dialogOpen, setDialogOpen] = useState(false);

    const activeProfile = profiles.find((p) => p.id === activeProfileId);

    return (
        <>
            <div className="p-3">
                {activeProfile ? (
                    <Button
                        variant="ghost"
                        className="flex items-center gap-3 w-full h-auto rounded-lg p-2 pr-3 text-left"
                        onClick={() => setDialogOpen(true)}
                    >
                        <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
                            <User className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{activeProfile.name}</div>
                            {activeProfile.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                    {activeProfile.description}
                                </div>
                            )}
                        </div>
                        <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
                    </Button>
                ) : (
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 w-full h-auto rounded-lg px-4 py-2 text-left text-muted-foreground"
                        onClick={() => setDialogOpen(true)}
                    >
                        <UserPlus className="size-4" />
                        <span className="text-sm">{t("addProfile")}</span>
                    </Button>
                )}
            </div>

            <ProfilesDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                profiles={profiles}
                activeProfileId={activeProfileId}
                onProfilesChange={setProfiles}
                onActiveProfileChange={setActiveProfileId}
            />
        </>
    );
}

/**
 * Mobile sidebar rendered as a Sheet overlay.
 * Contains endpoint management, preset selection, stats, and profile switching.
 *
 * @param props - Sidebar configuration including endpoints, filters, settings, and logs
 */
export function MobileSidebar(props: SidebarProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 lg:hidden">
                    <Menu className="size-4" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0" aria-describedby={undefined}>
                <VisuallyHidden.Root>
                    <SheetTitle>Navigation</SheetTitle>
                </VisuallyHidden.Root>
                <div className="flex flex-col h-full">
                    <ReactLenis className="flex-1 overflow-y-auto">
                        <div className="p-6 transition-all sheet-sidebar-content">
                            <SidebarContent {...props} />
                        </div>
                    </ReactLenis>
                    <ProfileSection />
                </div>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Desktop sidebar rendered as a fixed resizable panel.
 * Contains endpoint management, preset selection, stats, and profile switching.
 *
 * @param props - Sidebar configuration including endpoints, filters, settings, and logs
 */
export function DesktopSidebar(props: SidebarProps) {
    const [width, setWidth] = useLocalStorage<number>("sidebarWidth", 288);

    const handleResize = useCallback(
        (delta: number) => setWidth((w) => Math.min(400, Math.max(200, w + delta))),
        [setWidth]
    );

    return (
        <aside
            className="hidden lg:flex lg:flex-col relative shrink-0 border-r h-dvh sticky top-0 overflow-hidden"
            style={{ width }}
        >
            <ReactLenis className="flex-1 overflow-y-auto">
                <div className="p-5">
                    <SidebarContent {...props} />
                </div>
            </ReactLenis>
            <ProfileSection />
            <Resize side="right" onResize={handleResize} />
        </aside>
    );
}

/**
 * Default sidebar export that renders the mobile variant.
 * Used as the responsive entry point for the sidebar layout.
 *
 * @param props - Sidebar configuration including endpoints, filters, settings, and logs
 */
export default function Sidebar(props: SidebarProps) {
    return <MobileSidebar {...props} />;
}
