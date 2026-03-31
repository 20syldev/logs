"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "@/i18n/provider";
import { useTheme } from "@/hooks/theme";
import { useLocalStorage } from "@/hooks/storage";
import { config } from "@/data/config";
import ViewContent from "@/app/view/[slug]/content";

import {
    ArrowLeftRight,
    ArrowRight,
    Bookmark,
    BookOpen,
    Filter,
    GitCompareArrows,
    Github,
    Link2,
    Pin,
    Radio,
    ScanSearch,
    Settings,
    SlidersHorizontal,
} from "lucide-react";

export default function RootPage() {
    if (config.standalone) {
        return <ViewContent config={config.view} />;
    }

    return <LandingPage />;
}

function LandingPage() {
    const router = useRouter();
    const t = useTranslations("landing");
    useTheme();
    const [apiUrl, setApiUrl] = useState("");
    const [lastApi] = useLocalStorage<string>("lastApi", "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiUrl.trim()) return;
        router.push(`/monitor?api=${encodeURIComponent(apiUrl.trim())}`);
    };

    const features = [
        { icon: Radio, title: t("features.realtime"), description: t("features.realtimeDesc") },
        {
            icon: ScanSearch,
            title: t("features.detection"),
            description: t("features.detectionDesc"),
        },
        {
            icon: SlidersHorizontal,
            title: t("features.filters"),
            description: t("features.filtersDesc"),
        },
        { icon: Bookmark, title: t("features.presets"), description: t("features.presetsDesc") },
        {
            icon: GitCompareArrows,
            title: t("features.compare"),
            description: t("features.compareDesc"),
        },
        {
            icon: ArrowLeftRight,
            title: t("features.export"),
            description: t("features.exportDesc"),
        },
    ];

    const fields = [
        { key: "timestamp", values: t("format.timestampValues") },
        { key: "status", values: t("format.statusValues") },
        { key: "method", values: t("format.methodValues") },
        { key: "url", values: t("format.urlValues") },
        { key: "category", values: t("format.categoryValues") },
        { key: "source", values: t("format.sourceValues") },
        { key: "duration", values: t("format.durationValues") },
        { key: "message", values: t("format.messageValues") },
    ];

    return (
        <div className="min-h-dvh flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
                    <span className="text-lg font-semibold">Flowers</span>
                    <nav className="flex items-center gap-6">
                        <a
                            href="#features"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                        >
                            {t("nav.features")}
                        </a>
                        <a
                            href="#usage"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("nav.usage")}
                        </a>
                        <a
                            href="#format"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("nav.format")}
                        </a>
                        <a
                            href="#storage"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("nav.storage")}
                        </a>
                    </nav>
                </div>
            </header>

            {/* Hero */}
            <section className="h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center px-6 animate-in fade-in duration-700">
                <div className="max-w-2xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                        {t("hero.title")}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                        {t("hero.subtitle")}
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className="flex items-center max-w-lg mx-auto rounded-full border border-border/50 bg-muted/30 backdrop-blur-sm px-4 h-12 gap-3 focus-within:border-border focus-within:bg-muted/50 transition-all"
                    >
                        <Link2 className="size-4 shrink-0 text-muted-foreground/40" />
                        <input
                            type="url"
                            placeholder={t("hero.placeholder")}
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                        />
                        <button
                            type="submit"
                            disabled={!apiUrl.trim()}
                            className="shrink-0 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity"
                        >
                            <ArrowRight className="size-3.5" />
                        </button>
                    </form>

                    {lastApi ? (
                        <button
                            onClick={() =>
                                router.push(`/monitor?api=${encodeURIComponent(lastApi)}`)
                            }
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("hero.resume")}
                            <ArrowRight className="size-3.5" />
                        </button>
                    ) : (
                        <button
                            onClick={() => router.push("/monitor")}
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("hero.openApp")}
                            <ArrowRight className="size-3.5" />
                        </button>
                    )}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t py-16 px-6">
                <div className="max-w-3xl mx-auto space-y-10">
                    <h2 className="text-2xl font-semibold text-center">{t("features.title")}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="rounded-lg border bg-card p-4 space-y-1.5"
                            >
                                <div className="flex items-center gap-2">
                                    <feature.icon className="size-4 text-muted-foreground" />
                                    <p className="text-sm font-medium">{feature.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How to use */}
            <section id="usage" className="border-t py-16 px-6">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-2xl font-semibold">{t("usage.title")}</h2>
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                        <li>
                            <strong className="text-foreground">{t("usage.step1Title")}</strong>
                            {" — "}
                            {t("usage.step1")}
                        </li>
                        <li>
                            <strong className="text-foreground">{t("usage.step2Title")}</strong>
                            {" — "}
                            {t("usage.step2")}
                        </li>
                        <li>
                            <strong className="text-foreground">{t("usage.step3Title")}</strong>
                            {" — "}
                            {t("usage.step3")}
                        </li>
                    </ol>
                </div>
            </section>

            {/* JSON format */}
            <section id="format" className="border-t py-16 px-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    <h2 className="text-2xl font-semibold">{t("format.title")}</h2>
                    <p className="text-muted-foreground">{t("format.description")}</p>

                    <pre className="bg-card border rounded-lg p-4 text-sm overflow-x-auto">
                        {`[
  {
    "status": 200,
    "method": "GET",
    "url": "/api/users",
    "timestamp": 1710000000000,
    "duration": "45ms",
    "source": "nginx"
  }
]`}
                    </pre>

                    <p className="text-muted-foreground">{t("format.keywords")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1.5">
                        {fields.map((field) => (
                            <li key={field.key}>
                                <strong className="text-foreground">
                                    {t(`format.${field.key}`)}
                                </strong>
                                {" — "}
                                {field.values}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Storage */}
            <section id="storage" className="border-t py-16 px-6">
                <div className="max-w-3xl mx-auto space-y-10">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">{t("storage.title")}</h2>
                        <p className="text-muted-foreground">{t("storage.description")}</p>
                    </div>
                    <ul className="space-y-3">
                        {[
                            { icon: Link2, key: "endpoints" },
                            { icon: Bookmark, key: "presets" },
                            { icon: Filter, key: "filters" },
                            { icon: Settings, key: "settings" },
                            { icon: Pin, key: "pins" },
                        ].map((item) => (
                            <li key={item.key} className="flex items-start gap-3">
                                <item.icon className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">
                                        {t(`storage.${item.key}`)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {t(`storage.${item.key}Desc`)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="text-sm text-muted-foreground">{t("storage.note")}</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-8 px-6">
                <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
                    <div className="space-y-1">
                        <p>© 2026 flowers.sylvain.sh</p>
                        <div className="flex items-center gap-1.5 text-xs">
                            <Link href="/legal" className="hover:text-foreground transition-colors">
                                {t("footer.legal")}
                            </Link>
                            <span>·</span>
                            <Link
                                href="/privacy"
                                className="hover:text-foreground transition-colors"
                            >
                                {t("footer.privacy")}
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/20syldev/flowers/releases/latest"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            <BookOpen className="size-4" />
                        </a>
                        <a
                            href="https://github.com/20syldev/flowers"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            <Github className="size-4" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}