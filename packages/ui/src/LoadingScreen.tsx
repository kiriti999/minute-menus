import type React from "react";

export type LoadingScreenProps = {
    label?: string;
    className?: string;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    label,
    className = "min-h-screen bg-black flex items-center justify-center",
}) => (
    <div className={className}>
        {label ? (
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400">{label}</p>
            </div>
        ) : (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
    </div>
);

/** @deprecated Use LoadingScreen — kept for incremental migration */
export const AppLoadingScreen = LoadingScreen;
