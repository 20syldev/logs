"use client";

import { useState } from "react";
import { Check, ChevronDown, Radio } from "lucide-react";
import { useTranslations } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ViewEndpoint } from "@/data/views";

interface SelectorProps {
    endpoints: ViewEndpoint[];
    activeIndex: number;
    onChange: (index: number) => void;
}

export default function Selector({ endpoints, activeIndex, onChange }: SelectorProps) {
    const t = useTranslations("selector");
    const [open, setOpen] = useState(false);

    if (endpoints.length < 2) return null;

    return (
        <>
            <Button
                variant="outline"
                size="xs"
                onClick={() => setOpen(true)}
                className="gap-1.5 rounded-full"
            >
                <Radio className="size-3.5" />
                {endpoints[activeIndex].name}
                <ChevronDown className="size-3 text-muted-foreground" />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("title")}</DialogTitle>
                        <DialogDescription>{t("description")}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-1">
                        {endpoints.map((ep, i) => (
                            <button
                                key={ep.url}
                                onClick={() => {
                                    onChange(i);
                                    setOpen(false);
                                }}
                                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                                    i === activeIndex
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-muted"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{ep.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {ep.url}
                                    </p>
                                </div>
                                {i === activeIndex && <Check className="size-4 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}