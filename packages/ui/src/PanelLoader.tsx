import type React from "react";
import { Spinner } from "./Spinner";

export type PanelLoaderProps = {
    label: string;
    className?: string;
    labelClassName?: string;
    spinnerClassName?: string;
};

export const PanelLoader: React.FC<PanelLoaderProps> = ({
    label,
    className = "flex flex-col items-center justify-center py-32 px-8 text-center",
    labelClassName = "text-sm font-medium text-zinc-400",
    spinnerClassName = "text-zinc-400 mb-4",
}) => (
    <div className={className}>
        <Spinner size="lg" className={spinnerClassName} />
        <p className={labelClassName}>{label}</p>
    </div>
);
