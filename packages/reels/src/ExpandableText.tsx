import type React from "react";
import { useEffect, useRef, useState } from "react";

interface ExpandableTextProps {
    text: string;
    lines?: 1 | 2;
    className?: string;
    toggleClassName?: string;
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({
    text,
    lines = 2,
    className = "",
    toggleClassName = "mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-300",
}) => {
    const [expanded, setExpanded] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const ref = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || expanded) return;

        const check = () => setTruncated(el.scrollHeight > el.clientHeight + 1);
        check();

        const observer = new ResizeObserver(check);
        observer.observe(el);
        return () => observer.disconnect();
    }, [text, lines, expanded]);

    const clampClass = lines === 1 ? "line-clamp-1" : "line-clamp-2";

    return (
        <div className="min-w-0">
            <p ref={ref} className={`${expanded ? "" : clampClass} ${className}`.trim()}>
                {text}
            </p>
            {(expanded || truncated) && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setExpanded((prev) => !prev);
                    }}
                    className={toggleClassName}
                >
                    {expanded ? "Show less" : "Show more"}
                </button>
            )}
        </div>
    );
};
