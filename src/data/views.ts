export interface ViewEndpoint {
    name: string;
    url: string;
}

export interface ViewOptions {
    title: string;
    endpoints: ViewEndpoint[];
    interval?: number;
}

export interface ViewConfig extends ViewOptions {
    slug: string;
}

export const views: ViewConfig[] = [
    {
        slug: "demo",
        title: "Demo",
        endpoints: [{ name: "API Logs", url: "https://api.sylvain.sh/logs" }],
    },
];