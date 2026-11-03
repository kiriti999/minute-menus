import { ArrowLeft } from "lucide-react";
import type React from "react";

export interface BackButtonProps {
	label: string;
	onClick: () => void;
	isDarkTheme: boolean;
	className?: string;
}

/** The back button used on every page: arrow only on phones, arrow + destination from `sm` up. */
export const BackButton: React.FC<BackButtonProps> = ({ label, onClick, isDarkTheme, className = "" }) => (
	<button
		type="button"
		onClick={onClick}
		aria-label={`Back to ${label}`}
		title={`Back to ${label}`}
		className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${
			isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
		} ${className}`}
	>
		<ArrowLeft size={16} />
		<span className="hidden sm:inline">{label}</span>
	</button>
);
