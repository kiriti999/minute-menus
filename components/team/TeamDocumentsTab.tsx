import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import type { OfferLetterDetails, RestaurantStaffMember, StaffDocument } from "@minute-menus/types";
import { getErrorMessage } from "@minute-menus/errors";
import { supabaseService } from "../../services/supabaseService";
import { OfferLetterFormModal, OfferLetterPreviewModal } from "./OfferLetterModals";

interface Props {
	isDarkTheme: boolean;
}

interface RestaurantInfo {
	name: string;
	currency: string;
}

interface StaffCardProps {
	isDarkTheme: boolean;
	staff: RestaurantStaffMember;
	docs: StaffDocument[];
	busy: boolean;
	onGenerate: () => void;
	onUpload: (file: File) => void;
	onOpen: (doc: StaffDocument) => void;
	onDelete: (doc: StaffDocument) => void;
}

const StaffDocumentsCard: React.FC<StaffCardProps> = ({
	isDarkTheme,
	staff,
	docs,
	busy,
	onGenerate,
	onUpload,
	onOpen,
	onDelete,
}) => {
	const fileRef = useRef<HTMLInputElement>(null);
	const border = isDarkTheme ? "border-zinc-800" : "border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-500" : "text-zinc-600";
	const hasOffer = docs.length > 0;

	return (
		<div className={`rounded-xl border p-4 space-y-3 ${border}`}>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="min-w-0">
					<p className="font-medium truncate">{staff.name}</p>
					<p className={`text-xs ${muted}`}>{staff.phone ?? "No phone"}</p>
				</div>
				<span
					className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
						hasOffer ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
					}`}
				>
					{hasOffer ? "Offer issued" : "No offer"}
				</span>
			</div>
			{docs.map((doc) => (
				<div key={doc.id} className={`flex items-center justify-between gap-2 text-sm border-t pt-2 ${border}`}>
					<button type="button" onClick={() => onOpen(doc)} className="flex items-center gap-2 min-w-0 text-left">
						<FileText size={14} className="shrink-0" />
						<span className="truncate">{doc.title}</span>
						<span className={`text-xs shrink-0 ${muted}`}>{doc.createdAt.slice(0, 10)}</span>
					</button>
					<button
						type="button"
						aria-label="Delete document"
						disabled={busy}
						onClick={() => onDelete(doc)}
						className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10"
					>
						<Trash2 size={14} />
					</button>
				</div>
			))}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={busy}
					onClick={onGenerate}
					className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-black disabled:opacity-40"
				>
					Generate letter
				</button>
				<button
					type="button"
					disabled={busy}
					onClick={() => fileRef.current?.click()}
					className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-700 flex items-center gap-1 disabled:opacity-40"
				>
					<Upload size={12} /> Upload
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="application/pdf,image/*"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (file) onUpload(file);
					}}
				/>
			</div>
		</div>
	);
};

export const TeamDocumentsTab: React.FC<Props> = ({ isDarkTheme }) => {
	const [staff, setStaff] = useState<RestaurantStaffMember[]>([]);
	const [docs, setDocs] = useState<StaffDocument[]>([]);
	const [restaurant, setRestaurant] = useState<RestaurantInfo>({ name: "", currency: "INR" });
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formFor, setFormFor] = useState<RestaurantStaffMember | null>(null);
	const [preview, setPreview] = useState<StaffDocument | null>(null);

	const load = useCallback(async () => {
		try {
			const [staffList, docList, details] = await Promise.all([
				supabaseService.listRestaurantStaff(),
				supabaseService.listStaffDocuments(),
				supabaseService.getRestaurantDetails(),
			]);
			setStaff(staffList.filter((s) => s.active));
			setDocs(docList);
			setRestaurant({ name: details.name, currency: details.currency });
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const run = async (task: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		try {
			await task();
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};

	const handleGenerate = (details: OfferLetterDetails) =>
		run(async () => {
			if (!formFor) return;
			const doc = await supabaseService.createGeneratedOfferLetter(formFor.id, details);
			setDocs((prev) => [doc, ...prev]);
			setFormFor(null);
			setPreview(doc);
		});

	const handleUpload = (staffId: string, file: File) =>
		run(async () => {
			const doc = await supabaseService.uploadOfferLetter(staffId, file);
			setDocs((prev) => [doc, ...prev]);
		});

	const handleOpen = (doc: StaffDocument) =>
		run(async () => {
			if (!doc.filePath) return setPreview(doc);
			window.open(await supabaseService.getStaffDocumentUrl(doc.filePath), "_blank", "noopener");
		});

	const handleDelete = (doc: StaffDocument) => {
		if (!window.confirm(`Delete "${doc.title}"?`)) return;
		void run(async () => {
			await supabaseService.deleteStaffDocument(doc);
			setDocs((prev) => prev.filter((d) => d.id !== doc.id));
		});
	};

	const muted = isDarkTheme ? "text-zinc-500" : "text-zinc-600";
	const previewStaff = preview ? staff.find((s) => s.id === preview.staffId) : undefined;

	return (
		<div className="space-y-4">
			<p className={`text-sm ${muted}`}>
				Offer letters per team member — generate a printable letter or upload a signed copy.
			</p>
			{error && (
				<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
			)}
			{loading && <p className={`text-sm ${muted}`}>Loading…</p>}
			{!loading && staff.length === 0 && <p className={`text-sm ${muted}`}>Add staff in the Team tab first.</p>}
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{staff.map((member) => (
					<StaffDocumentsCard
						key={member.id}
						isDarkTheme={isDarkTheme}
						staff={member}
						docs={docs.filter((d) => d.staffId === member.id)}
						busy={busy}
						onGenerate={() => setFormFor(member)}
						onUpload={(file) => void handleUpload(member.id, file)}
						onOpen={(doc) => void handleOpen(doc)}
						onDelete={handleDelete}
					/>
				))}
			</div>
			{formFor && (
				<OfferLetterFormModal
					isDarkTheme={isDarkTheme}
					staff={formFor}
					restaurantName={restaurant.name}
					saving={busy}
					onSave={(details) => void handleGenerate(details)}
					onClose={() => setFormFor(null)}
				/>
			)}
			{preview && (
				<OfferLetterPreviewModal
					isDarkTheme={isDarkTheme}
					doc={preview}
					staffName={previewStaff?.name ?? "Employee"}
					restaurantName={restaurant.name}
					currency={restaurant.currency}
					onClose={() => setPreview(null)}
				/>
			)}
		</div>
	);
};
