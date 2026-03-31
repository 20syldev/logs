import { notFound, redirect } from "next/navigation";
import { views } from "@/data/views";
import { config } from "@/data/config";
import Content from "./content";

export const dynamicParams = false;

export function generateStaticParams() {
    if (config.standalone) return [{ slug: "_" }];
    return views.map((v) => ({ slug: v.slug }));
}

export default async function ViewPage({ params }: { params: Promise<{ slug: string }> }) {
    if (config.standalone) redirect("/");

    const { slug } = await params;
    const view = views.find((v) => v.slug === slug);

    if (!view) return notFound();

    return <Content config={view} />;
}