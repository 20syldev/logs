import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/i18n/provider";
import { config } from "@/data/config";
import Scroll from "@/components/layout/scroll";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
    title: config.standalone ? config.view.title : "Flowers",
    description: config.standalone
        ? `Monitoring: ${config.view.endpoints.map((e) => e.name).join(", ")}`
        : "A lightweight, real-time data viewer for any JSON API. Auto-detects your data structure and displays it beautifully.",
    openGraph: {
        title: config.standalone ? config.view.title : "Flowers",
        description: config.standalone
            ? `Monitoring: ${config.view.endpoints.map((e) => e.name).join(", ")}`
            : "A lightweight, real-time data viewer for any JSON API.",
        url: "https://logs.sylvain.sh",
        type: "website",
    },
    icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
            <body className={`${outfit.variable} font-sans antialiased`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <LocaleProvider>
                        <Scroll>{children}</Scroll>
                    </LocaleProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}