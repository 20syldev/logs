"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
} from "react";
import { defaultLocale, type Locale, locales } from "./config";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

type Messages = typeof en;
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
    ? {
          [K in keyof T & string]: T[K] extends object
              ? NestedKeyOf<T[K], `${Prefix}${K}.`>
              : `${Prefix}${K}`;
      }[keyof T & string]
    : never;

export type TranslationKey = NestedKeyOf<Messages>;

const allMessages: Record<Locale, Messages> = { en, fr };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== "object") return path;
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : path;
}

interface LocaleContextValue {
    locale: Locale;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
    locale: defaultLocale,
    t: (key) => key,
});

/**
 * Hook that returns a translation function scoped to an optional namespace.
 * Supports parameter interpolation via {key} placeholders in translation strings.
 *
 * @param namespace - Optional dot-separated namespace to prefix all keys (e.g. "sidebar")
 * @returns Translation function that takes a key and optional params
 */
export function useTranslations(namespace?: string) {
    const { t } = useContext(LocaleContext);
    if (!namespace) return t;
    return (key: string, params?: Record<string, string | number>) =>
        t(`${namespace}.${key}`, params);
}

function detectLocale(): Locale {
    if (typeof navigator === "undefined") return defaultLocale;
    const lang = navigator.language.split("-")[0];
    return (locales as readonly string[]).includes(lang) ? (lang as Locale) : defaultLocale;
}

const noop = () => () => {};
const getLocale = () => detectLocale();
const getServerLocale = () => defaultLocale;

/**
 * Provider component that detects the browser locale and supplies
 * translation context to all child components.
 * Sets the document lang attribute to match the detected locale.
 *
 * @param props.children - Child components that consume translations
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const locale = useSyncExternalStore(noop, getLocale, getServerLocale);

    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>) => {
            let value = getNestedValue(
                allMessages[locale] as unknown as Record<string, unknown>,
                key
            );
            if (params) {
                for (const [k, v] of Object.entries(params)) {
                    value = value.replace(`{${k}}`, String(v));
                }
            }
            return value;
        },
        [locale]
    );

    const ctx = useMemo(() => ({ locale, t }), [locale, t]);

    return <LocaleContext.Provider value={ctx}>{children}</LocaleContext.Provider>;
}