import { Loader2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface RecipeLinksModalProps {
	title: string;
	initialVideoUrl: string;
	initialArticleUrl: string;
	isDarkTheme: boolean;
	onSave: (videoUrl: string, articleUrl: string) => Promise<void>;
	onClose: () => void;
}

const INPUT_BASE = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0B4A42]";

/** Add / edit the video and article link for one recipe card. Both blank clears them. */
export const RecipeLinksModal: React.FC<RecipeLinksModalProps> = ({
	title,
	initialVideoUrl,
	initialArticleUrl,
	isDarkTheme,
	onSave,
	onClose,
}) => {
	const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
	const [articleUrl, setArticleUrl] = useState(initialArticleUrl);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900";
	const input = `${INPUT_BASE} ${isDarkTheme ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-zinc-300"}`;

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		try {
			await onSave(videoUrl, articleUrl);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save links");
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
			<form onSubmit={submit} className={`w-full max-w-md rounded-2xl border p-5 shadow-xl ${card}`}>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-xs uppercase tracking-wide opacity-60">Recipe links</p>
						<h2 className="text-lg font-semibold truncate">{title}</h2>
					</div>
					<button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-black/10">
						<X size={18} />
					</button>
				</div>
				<label className="mt-4 block text-sm font-medium">
					Video link
					<input
						type="url"
						value={videoUrl}
						onChange={(e) => setVideoUrl(e.target.value)}
						placeholder="https://youtube.com/…"
						className={`mt-1 ${input}`}
					/>
				</label>
				<label className="mt-3 block text-sm font-medium">
					Article link
					<input
						type="url"
						value={articleUrl}
						onChange={(e) => setArticleUrl(e.target.value)}
						placeholder="https://…"
						className={`mt-1 ${input}`}
					/>
				</label>
				<p className="mt-2 text-xs opacity-60">Leave both blank to remove the links.</p>
				{error && <p className="mt-3 text-sm text-red-500">{error}</p>}
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className={`px-4 py-2 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700" : "border-zinc-300"}`}
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#0B4A42] text-white disabled:opacity-50"
					>
						{saving && <Loader2 size={14} className="animate-spin" />}
						Save
					</button>
				</div>
			</form>
		</div>
	);
};
