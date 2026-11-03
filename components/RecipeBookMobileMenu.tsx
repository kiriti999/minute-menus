import { Printer, QrCode, Trash2, X } from "lucide-react";
import type React from "react";

export interface RecipeBookMobileMenuProps {
	isDarkTheme: boolean;
	isOwner: boolean;
	deletedCount: number;
	onDeleted: () => void;
	onQr: () => void;
	onPrint: () => void;
	onClose: () => void;
}

/** Phone-only side drawer (70% wide) holding the toolbar actions that do not fit in the bar. */
export const RecipeBookMobileMenu: React.FC<RecipeBookMobileMenuProps> = ({
	isDarkTheme,
	isOwner,
	deletedCount,
	onDeleted,
	onQr,
	onPrint,
	onClose,
}) => {
	const panel = isDarkTheme ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900";
	const item = `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${isDarkTheme ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`;
	// Run the action, then close the drawer so the page behind is usable.
	const choose = (action: () => void) => () => {
		onClose();
		action();
	};

	return (
		<div className="sm:hidden fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Menu">
			<button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/60" />
			<div className={`relative h-full w-[70%] overflow-y-auto border-l p-4 space-y-2 ${panel}`}>
				<div className="flex items-center justify-between pb-2">
					<h2 className="text-base font-bold">Menu</h2>
					<button type="button" onClick={onClose} aria-label="Close menu" className="p-1 opacity-70 hover:opacity-100">
						<X size={22} />
					</button>
				</div>
				{isOwner && deletedCount > 0 && (
					<button type="button" onClick={choose(onDeleted)} className={item}>
						<Trash2 size={18} />
						Deleted ({deletedCount})
					</button>
				)}
				{isOwner && (
					<button type="button" onClick={choose(onQr)} className={item}>
						<QrCode size={18} />
						QR code
					</button>
				)}
				<button type="button" onClick={choose(onPrint)} className={item}>
					<Printer size={18} />
					Print / PDF
				</button>
			</div>
		</div>
	);
};
