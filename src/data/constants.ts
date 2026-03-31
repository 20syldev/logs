export const interval = 2000;

export const options = [
    { value: 1000, label: "1s" },
    { value: 2000, label: "2s" },
    { value: 5000, label: "5s" },
    { value: 10000, label: "10s" },
    { value: 30000, label: "30s" },
];

export type FetchStatus = "connecting" | "connected" | "paused" | "error" | "empty";

export const statusDotColor: Record<FetchStatus, string> = {
    connecting: "bg-blue-400 animate-pulse",
    connected: "bg-green-400",
    paused: "bg-amber-400",
    error: "bg-red-400",
    empty: "bg-muted",
};