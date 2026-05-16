import type { NextConfig } from "next";
import { readFileSync } from "fs";

let endpointsConfig: Record<string, unknown> = {};
try {
    endpointsConfig = JSON.parse(readFileSync("endpoints.json", "utf-8"));
} catch {
    // No endpoints.json — standalone mode disabled
}

const nextConfig: NextConfig = {
    output: process.env.NODE_ENV === "production" ? "export" : undefined,
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    env: {
        FLOWERS_CONFIG: JSON.stringify(endpointsConfig),
    },
};

export default nextConfig;