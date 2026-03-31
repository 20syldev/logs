"use client";

import { ReactLenis } from "lenis/react";

/**
 * Wrapper component that provides smooth scrolling via Lenis.
 * Applied at the root level with customized lerp and duration settings.
 *
 * @param props.children - Page content to wrap with smooth scrolling
 */
export default function Scroll({ children }: { children: React.ReactNode }) {
    return (
        <ReactLenis root options={{ lerp: 0.1, duration: 1.2 }}>
            {children}
        </ReactLenis>
    );
}
