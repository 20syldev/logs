"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "@/i18n/provider";
import type { DataEntry } from "@/hooks/fetcher";

interface NotificationsProps {
    logs: DataEntry[];
    enabled: boolean;
    soundEnabled: boolean;
}

function playErrorBeep() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = "sine";
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // Web Audio not available
    }
}

/**
 * Headless component that manages browser notifications and sound alerts for error logs.
 * Requests notification permission on mount, plays an audio beep for errors,
 * and sends browser notifications when the tab is hidden.
 *
 * @param props.logs - Current list of log entries to monitor for new errors
 * @param props.enabled - Whether browser notifications are enabled
 * @param props.soundEnabled - Whether audio beep alerts are enabled
 */
export default function Notifications({ logs, enabled, soundEnabled }: NotificationsProps) {
    const t = useTranslations("notifications");
    const prevCountRef = useRef(logs.length);
    const permissionRef = useRef<NotificationPermission>("default");

    useEffect(() => {
        if (enabled && "Notification" in window) {
            Notification.requestPermission().then((p) => {
                permissionRef.current = p;
            });
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled && !soundEnabled) return;

        const prevCount = prevCountRef.current;
        prevCountRef.current = logs.length;

        if (logs.length <= prevCount) return;

        const newLogs = logs.slice(prevCount);
        const errorLogs = newLogs.filter((l) => {
            const status = l.status ?? l.statusCode ?? l.status_code ?? l.code;
            return typeof status === "number" && status >= 400;
        });

        if (!errorLogs.length) return;

        if (soundEnabled) {
            playErrorBeep();
        }

        if (enabled && permissionRef.current === "granted" && document.hidden) {
            const log = errorLogs[0];
            const status = log.status ?? log.statusCode ?? log.status_code ?? log.code ?? "Unknown";
            const method = log.method ?? log.verb ?? log.action ?? "";
            const url = log.url ?? log.path ?? log.endpoint ?? "";
            new Notification(`${t("titlePrefix")}${status}${t("errorSuffix")}`, {
                body: `${method} ${url}`,
                icon: "/favicon.ico",
            });
        }
    }, [logs, enabled, soundEnabled, t]);

    return null;
}