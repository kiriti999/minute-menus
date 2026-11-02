import { ImagePlus, Loader2, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import type { RecipeDraft } from "../lib/recipeBook/recipeEditText";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("Could not read the image"));
		reader.readAsDataURL(file);
	});
}

export interface RecipeEditModalProps {
	title: string;
	/** Other recipes' titles, offered by "Insert link to recipe". */
	linkTargets: string[];
	/** Current photo of the card, if any. */
	imageUrl?: string;
	/** Uploads a photo (data URL) right away — independent of Save. */
	onUploadImage: (dataUrl: string) => Promise<void>;
	onRemoveImage: () => Promise<void>;
	initialDraft: RecipeDraft;
	/** True when the card already has an owner edit, so "Reset to default" applies. */
	isEdited: boolean;
	isDarkTheme: boolean;
	onSave: (draft: RecipeDraft) => Promise<void>;
	onReset: () => Promise<void>;
	/** Deletes (hides) the recipe from the book. */
	onDelete: () => Promise<void>;
	onClose: () => void;
}

const FIELD = "mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0B4A42]";

/** Edit the kitchen build and method of one recipe card (text in, text out — parsing lives in recipeEditText). */
export const RecipeEditModal: React.FC<RecipeEditModalProps> = ({
	title,
	linkTargets,
	imageUrl,
	onUploadImage,
	onRemoveImage,
	initialDraft,
	isEdited,
	isDarkTheme,
	onSave,
	onReset,
	onDelete,
	onClose,
}) => {
	const [draft, setDraft] = useState<RecipeDraft>(initialDraft);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [photoBusy, setPhotoBusy] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);
	const lastText = useRef<HTMLTextAreaElement | null>(null);

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900";
	const field = `${FIELD} ${isDarkTheme ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-zinc-300"}`;
	const outline = `px-4 py-2 rounded-full text-sm font-semibold border disabled:opacity-50 ${isDarkTheme ? "border-zinc-700" : "border-zinc-300"}`;

	const set = (key: keyof RecipeDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setDraft((d) => ({ ...d, [key]: e.target.value }));

	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		setError("");
		try {
			await action();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save recipe");
			setBusy(false);
		}
	};

	const runPhoto = async (action: () => Promise<void>) => {
		setPhotoBusy(true);
		setError("");
		try {
			await action();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not update the photo");
		} finally {
			setPhotoBusy(false);
		}
	};

	const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) return setError("Choose an image file");
		if (file.size > MAX_PHOTO_BYTES) return setError("Image is too large (max 15MB)");
		void runPhoto(async () => onUploadImage(await readAsDataUrl(file)));
	};

	const trackText = (e: React.FocusEvent<HTMLTextAreaElement>) => {
		lastText.current = e.target;
	};

	const insertLink = (name: string) => {
		const el = lastText.current;
		if (!name || !el) return;
		const key = el.name as keyof RecipeDraft;
		const tag = `[[${name}]]`;
		const text = draft[key];
		const at = el.selectionStart ?? text.length;
		setDraft((d) => ({ ...d, [key]: text.slice(0, at) + tag + text.slice(el.selectionEnd ?? at) }));
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		void run(() => onSave(draft));
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
			<form
				onSubmit={submit}
				className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-xl ${card}`}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-xs uppercase tracking-wide opacity-60">Edit recipe</p>
						<h2 className="text-lg font-semibold truncate">{title}</h2>
					</div>
					<button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-full hover:bg-black/10">
						<X size={18} />
					</button>
				</div>

				<div className="mt-4 flex items-center gap-3">
					{imageUrl ? (
						<img src={imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover border border-black/10" />
					) : (
						<div className="h-20 w-28 rounded-lg border border-dashed border-black/20 flex items-center justify-center opacity-60">
							<ImagePlus size={22} />
						</div>
					)}
					<div className="flex flex-col items-start gap-2">
						<input ref={fileInput} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
						<button
							type="button"
							disabled={photoBusy || busy}
							onClick={() => fileInput.current?.click()}
							className={`inline-flex items-center gap-2 ${outline}`}
						>
							{photoBusy && <Loader2 size={14} className="animate-spin" />}
							{imageUrl ? "Replace image" : "Upload image"}
						</button>
						{imageUrl && (
							<button
								type="button"
								disabled={photoBusy || busy}
								onClick={() => void runPhoto(onRemoveImage)}
								className="text-xs underline opacity-70 disabled:opacity-40"
							>
								Remove image
							</button>
						)}
					</div>
				</div>

				<label className="mt-4 block text-sm font-medium">
					Recipe name
					<input value={draft.title} onChange={set("title")} required className={field} />
				</label>
				<label className="mt-3 block text-sm font-medium">
					Yield / portion note
					<input value={draft.yieldNote} onChange={set("yieldNote")} placeholder="e.g. 1 wrap" className={field} />
				</label>
				<label className="mt-3 block text-sm font-medium">
					Quantity columns
					<input
						value={draft.columns}
						onChange={set("columns")}
						placeholder="Qty  — or: 1 serve | 3 serves | 6 serves"
						className={field}
					/>
				</label>
				<label className="mt-3 block text-sm font-medium">
					Ingredients
					<textarea
						name="ingredients"
						onFocus={trackText}
						value={draft.ingredients}
						onChange={set("ingredients")}
						rows={9}
						placeholder={"One per line:  Item | qty\n# Group heading"}
						className={`${field} font-mono`}
					/>
				</label>
				<p className="mt-1 text-xs opacity-60">
					Separate the quantity from the item with <b>|</b> (one per column). Start a line with <b>#</b> for a group heading.
				</p>
				<label className="mt-3 block text-sm font-medium">
					Method (one step per line)
					<textarea name="steps" onFocus={trackText} value={draft.steps} onChange={set("steps")} rows={7} className={field} />
				</label>
				<label className="mt-3 block text-sm font-medium">
					Insert link to recipe
					<select
						value=""
						onChange={(e) => insertLink(e.target.value)}
						className={field}
					>
						<option value="">Choose a recipe (click in a box above first)…</option>
						{linkTargets.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
				</label>
				<p className="mt-1 text-xs opacity-60">
					Or type <b>[[Recipe name]]</b> in an ingredient, step or note — it becomes a 🔗 link to that recipe.
				</p>
				<label className="mt-3 block text-sm font-medium">
					Notes (one per line, optional)
					<textarea name="notes" onFocus={trackText} value={draft.notes} onChange={set("notes")} rows={3} className={field} />
				</label>

				{error && <p className="mt-3 text-sm text-red-500">{error}</p>}
				{confirmingDelete && (
					<div className="mt-4 rounded-lg border border-red-500/50 p-3 text-sm">
						<p>Delete this recipe from the book? You can restore it later from "Deleted recipes".</p>
						<div className="mt-2 flex gap-2">
							<button
								type="button"
								disabled={busy}
								onClick={() => void run(onDelete)}
								className="px-4 py-1.5 rounded-full text-sm font-semibold bg-red-600 text-white disabled:opacity-50"
							>
								Yes, delete
							</button>
							<button type="button" disabled={busy} onClick={() => setConfirmingDelete(false)} className={outline}>
								Keep
							</button>
						</div>
					</div>
				)}
				<div className="mt-5 flex flex-wrap items-center justify-between gap-2">
					<div className="flex flex-wrap gap-2">
						{isEdited && (
							<button type="button" disabled={busy} onClick={() => void run(onReset)} className={outline}>
								Reset to default
							</button>
						)}
						<button
							type="button"
							disabled={busy || confirmingDelete}
							onClick={() => setConfirmingDelete(true)}
							className="px-4 py-2 rounded-full text-sm font-semibold border border-red-500/60 text-red-500 disabled:opacity-50"
						>
							Delete recipe
						</button>
					</div>
					<div className="flex gap-2">
						<button type="button" disabled={busy} onClick={onClose} className={outline}>
							Cancel
						</button>
						<button
							type="submit"
							disabled={busy}
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#0B4A42] text-white disabled:opacity-50"
						>
							{busy && <Loader2 size={14} className="animate-spin" />}
							Save
						</button>
					</div>
				</div>
			</form>
		</div>
	);
};
