import { Loader2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface RecipeRestoreModalProps {
	/** Lower-cased card titles of deleted recipes. */
	recipeKeys: string[];
	isDarkTheme: boolean;
	onRestore: (recipeKey: string) => Promise<void>;
	onClose: () => void;
}

/** Lists deleted recipes so the owner can bring one back. */
export const RecipeRestoreModal: React.FC<RecipeRestoreModalProps> = ({ recipeKeys, isDarkTheme, onRestore, onClose }) => {
	const [busyKey, setBusyKey] = useState<string | null>(null);
	const [error, setError] = useState("");

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900";

	const restore = async (key: string) => {
		setBusyKey(key);
		setError("");
		try {
			await onRestore(key);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not restore recipe");
		} finally {
			setBusyKey(null);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
			<div className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl border p-5 shadow-xl ${card}`}>
				<div className="flex items-start justify-between gap-3">
					<h2 className="text-lg font-semibold">Deleted recipes</h2>
					<button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-black/10">
						<X size={18} />
					</button>
				</div>
				{recipeKeys.length === 0 && <p className="mt-4 text-sm opacity-70">No deleted recipes.</p>}
				<ul className="mt-3 divide-y divide-black/10">
					{recipeKeys.map((key) => (
						<li key={key} className="flex items-center justify-between gap-3 py-2">
							<span className="text-sm capitalize truncate">{key}</span>
							<button
								type="button"
								disabled={busyKey !== null}
								onClick={() => void restore(key)}
								className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0B4A42] text-white disabled:opacity-50"
							>
								{busyKey === key && <Loader2 size={12} className="animate-spin" />}
								Restore
							</button>
						</li>
					))}
				</ul>
				{error && <p className="mt-3 text-sm text-red-500">{error}</p>}
			</div>
		</div>
	);
};
