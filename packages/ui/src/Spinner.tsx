import type React from "react";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<SpinnerSize, string> = {
    xs: "w-3 h-3 border",
    sm: "w-3.5 h-3.5 border",
    md: "w-6 h-6 border-2",
    lg: "w-9 h-9 border-2",
};

export type SpinnerProps = {
    size?: SpinnerSize;
    className?: string;
};

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => (
    <div
        className={`${SIZE_CLASS[size]} border-current border-t-transparent rounded-full animate-spin ${className}`}
        aria-hidden
    />
);
