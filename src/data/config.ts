import type { ViewOptions } from "@/data/views";

interface SiteConfig {
    title?: string;
    endpoints?: { name: string; url: string }[];
    interval?: number;
}

interface FlowersConfig {
    standalone: boolean;
    view: ViewOptions;
}

let json: SiteConfig = {};
try {
    const path = "../../endpoints.json";
    json = (await import(path)).default;
} catch {
    // No endpoints.json — standalone mode disabled
}

export const config: FlowersConfig = {
    standalone: Object.keys(json).length > 0,
    view: {
        title: json.title ?? "Dashboard",
        endpoints: json.endpoints ?? [],
        interval: json.interval,
    },
};