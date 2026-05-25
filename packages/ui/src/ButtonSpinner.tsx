import type React from "react";
import { Spinner, type SpinnerSize } from "./Spinner";

export type ButtonSpinnerProps = {
    loading: boolean;
    children: React.ReactNode;
    spinnerSize?: SpinnerSize;
    className?: string;
};

export const ButtonSpinner: React.FC<ButtonSpinnerProps> = ({
    loading,
    children,
    spinnerSize = "md",
    className = "mx-auto",
}) => (loading ? <Spinner size={spinnerSize} className={className} /> : <>{children}</>);
