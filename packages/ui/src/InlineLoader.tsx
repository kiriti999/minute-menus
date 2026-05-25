import type React from "react";
import { Spinner } from "./Spinner";

export type InlineLoaderProps = {
    label: string;
    className?: string;
};

export const InlineLoader: React.FC<InlineLoaderProps> = ({ label, className = "" }) => (
    <span className={`text-sm flex items-center gap-2 ${className}`}>
        <Spinner size="sm" />
        {label}
    </span>
);
