import type { Filters } from "@/data/presets";

export interface Settings {
    interval: number;
    autoScroll: boolean;
    notifications: boolean;
    sound: boolean;
}

export interface SavedViewState {
    filters?: Filters;
    settings?: Settings;
    sidebarWidth?: number;
    detailWidth?: number;
    pinnedHashes?: string[];
}

export interface Endpoint {
    url: string;
    name: string;
    savedState?: SavedViewState;
}