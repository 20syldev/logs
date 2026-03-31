"use client";

import { useEffect } from "react";

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

function isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).isContentEditable
    );
}

/**
 * Hook that registers global keyboard shortcuts on the document.
 * Ignores shortcuts when an input, textarea, or contenteditable element is focused,
 * except for the Escape key which always fires.
 *
 * @param shortcuts - Map of key names to handler functions
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
    useEffect(() => {
        function handler(e: KeyboardEvent) {
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const key = e.key;
            const fn = shortcuts[key];
            if (!fn) return;

            // Escape always works, others are ignored when typing
            if (key !== "Escape" && isInputFocused()) return;

            e.preventDefault();
            fn(e);
        }

        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [shortcuts]);
}