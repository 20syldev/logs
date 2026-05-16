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

const json: SiteConfig = process.env.FLOWERS_CONFIG ? JSON.parse(process.env.FLOWERS_CONFIG) : {};

export const config: FlowersConfig = {
    standalone: Object.keys(json).length > 0,
    view: {
        title: json.title ?? "Dashboard",
        endpoints: json.endpoints ?? [],
        interval: json.interval,
    },
};