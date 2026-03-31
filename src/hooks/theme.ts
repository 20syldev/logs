"use client";

import { useTheme as useNextTheme } from "next-themes";

export type Theme = "system" | "light" | "dark";

/**
 * Hook that wraps next-themes to provide typed theme access.
 *
 * @returns Object with current theme ("system" | "light" | "dark") and setTheme function
 */
export function useTheme() {
    const { theme, setTheme } = useNextTheme();

    return {
        theme: (theme as Theme) ?? "system",
        setTheme: (t: Theme) => setTheme(t),
    };
}