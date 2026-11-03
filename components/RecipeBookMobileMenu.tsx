import { ChevronRight, Printer, QrCode, Trash2, X } from "lucide-react";
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

interface MenuRowProps {
	icon: React.ReactNode;
	label: string;
	hint: string;
	badge?: number;
	isDarkTheme: boolean;
	onClick: () => void;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, label, hint, badge, isDarkTheme, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors ${isDarkTheme ? "hover:bg-zinc-800 active:bg-zinc-800" : "hover:bg-zinc-50 active:bg-zinc-100"}`}
	>
		<span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? "bg-[#0B4A42]/40 text-emerald-300" : "bg-[#0B4A42]/10 text-[#0B4A42]"}`}>
			{icon}
		</span>
		<span className="min-w-0 flex-1">
			<span className="block text-sm font-semibold">{label}</span>
			<span className={`block text-xs ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>{hint}</span>
		</span>
		{badge !== undefined && (
			<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isDarkTheme ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
				{badge}
			</span>
		)}
		<ChevronRight size={16} className="shrink-0 opacity-40" />
	</button>
);

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
	const line = isDarkTheme ? "divide-zinc-800 border-zinc-800" : "divide-zinc-200 border-zinc-200";
	// Run the action, then close the drawer so the page behind is usable.
	const choose = (action: () => void) => () => {
		onClose();
		action();
	};

	return (
		<div className="sm:hidden fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Menu">
			<button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
			<div className={`relative flex h-full w-[70%] flex-col border-l shadow-2xl ${panel}`}>
				<div className={`flex items-center justify-between border-b px-4 py-4 ${line}`}>
					<h2 className="text-base font-bold tracking-tight">Menu</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close menu"
						className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
					>
						<X size={18} />
					</button>
				</div>
				<div className={`flex-1 divide-y overflow-y-auto border-b ${line}`}>
					{isOwner && deletedCount > 0 && (
						<MenuRow
							icon={<Trash2 size={18} />}
							label="Deleted recipes"
							hint="Restore removed recipes"
							badge={deletedCount}
							isDarkTheme={isDarkTheme}
							onClick={choose(onDeleted)}
						/>
					)}
					{isOwner && (
						<MenuRow
							icon={<QrCode size={18} />}
							label="QR code"
							hint="Download or print"
							isDarkTheme={isDarkTheme}
							onClick={choose(onQr)}
						/>
					)}
					<MenuRow
						icon={<Printer size={18} />}
						label="Print / PDF"
						hint="Save the recipe book"
						isDarkTheme={isDarkTheme}
						onClick={choose(onPrint)}
					/>
				</div>
			</div>
		</div>
	);
};
