import type React from "react";
import { Spinner } from "./Spinner";

export type SaveChangesButtonProps = {
    visible: boolean;
    isSaving: boolean;
    onClick: () => void;
    className?: string;
    saveIcon?: React.ReactNode;
};

export const SaveChangesButton: React.FC<SaveChangesButtonProps> = ({
    visible,
    isSaving,
    onClick,
    className = "",
    saveIcon,
}) => {
    if (!visible) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all animate-in fade-in duration-300 disabled:opacity-80 ${className}`}
        >
            {isSaving ? (
                <>
                    <Spinner size="xs" />
                    SAVING…
                </>
            ) : (
                <>
                    {saveIcon}
                    SAVE CHANGES
                </>
            )}
        </button>
    );
};
