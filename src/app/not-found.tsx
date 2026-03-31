"use client";

import Link from "next/link";
import { useTranslations } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    const t = useTranslations("notFound");

    return (
        <div className="min-h-dvh flex items-center justify-center px-6 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
                <p className="text-[clamp(6rem,20vw,8rem)] font-bold leading-none text-muted-bg">
                    404
                </p>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="text-muted-foreground max-w-sm mx-auto">{t("description")}</p>
                <Button asChild className="mt-4">
                    <Link href="/">{t("backHome")}</Link>
                </Button>
            </div>
        </div>
    );
}