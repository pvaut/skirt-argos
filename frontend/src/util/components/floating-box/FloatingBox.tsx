import React, { useEffect, useRef, useState } from "react";


type FloatingBoxProps = {
    anchorX: number;
    anchorY: number;
    children: React.ReactNode;
};


export const FloatingBox: React.FC<FloatingBoxProps> = ({ anchorX, anchorY, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
        position: "absolute",
        left: -9999, // Temporary off-screen until measured
        top: -9999,
        visibility: "hidden",
    });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const updatePosition = () => {
            const margin = 10;
            const rect = el.getBoundingClientRect();
            const boxWidth = rect.width;
            const boxHeight = rect.height;
            const viewportWidth = window.innerWidth - margin;
            const viewportHeight = window.innerHeight - margin;

            let left = anchorX;
            let top = anchorY;

            // Adjust if overflowing right
            if (left + boxWidth > viewportWidth)
                left = viewportWidth - boxWidth;

            // Adjust if overflowing bottom
            if (top + boxHeight > viewportHeight)
                top = viewportHeight - boxHeight;

            // Clamp to top-left
            left = Math.max(margin, left);
            top = Math.max(margin, top);

            setStyle({
                position: "absolute",
                left,
                top,
                visibility: "visible",
                zIndex: 1000,
            });
        };

        updatePosition();

        // Also respond to window resize
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [anchorX, anchorY, children]); // Recalculate when content changes too

    return (
        <div ref={ref} style={style}>
            {children}
        </div>
    );
};
