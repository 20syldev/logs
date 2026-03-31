"use client";

import { useCallback } from "react";

interface ResizeProps {
    side: "left" | "right";
    onResize: (delta: number) => void;
}

/**
 * Drag handle component for resizing panels.
 * Renders a thin vertical strip that responds to mouse drag events
 * and reports delta movement to the parent via onResize.
 *
 * @param props.side - Which side of the panel the handle is on ("left" or "right")
 * @param props.onResize - Callback receiving the horizontal pixel delta on each drag move
 */
export default function Resize({ side, onResize }: ResizeProps) {
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            let lastX = e.clientX;

            const handleMouseMove = (e: MouseEvent) => {
                const delta = e.clientX - lastX;
                lastX = e.clientX;
                onResize(side === "right" ? delta : -delta);
            };

            const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
            };

            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        },
        [side, onResize]
    );

    return (
        <div
            className={`absolute top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-50 ${
                side === "right" ? "right-0" : "left-0"
            }`}
            onMouseDown={handleMouseDown}
        />
    );
}
