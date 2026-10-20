import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { EmploymentType, OfferLetterDetails, RestaurantStaffMember, StaffDocument } from "@minute-menus/types";
import { SECURITY_DEPOSIT_BY_TYPE, defaultOfferLetterDetails } from "../../lib/offerLetterTemplate";
import { OFFER_LETTER_PRINT_STYLE, OfferLetterPaper } from "./OfferLetterPaper";

interface ThemeProps {
	isDarkTheme: boolean;
}

const overlay = "fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4";

function panelClass(isDarkTheme: boolean): string {
	return `rounded-t-2xl sm:rounded-2xl w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
		isDarkTheme ? "bg-zinc-900 text-white" : "bg-white text-zinc-900"
	}`;
}

function inputClass(isDarkTheme: boolean): string {
	return `w-full rounded-lg border px-3 py-2 text-sm outline-none ${
		isDarkTheme ? "bg-black border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-900"
	}`;
}

interface FormModalProps extends ThemeProps {
	staff: RestaurantStaffMember;
	restaurantName: string;
	saving: boolean;
	onSave: (details: OfferLetterDetails) => void;
	onClose: () => void;
}

export const OfferLetterFormModal: React.FC<FormModalProps> = ({
	isDarkTheme,
	staff,
	restaurantName,
	saving,
	onSave,
	onClose,
}) => {
	const [details, setDetails] = useState<OfferLetterDetails>(() => ({
		...defaultOfferLetterDetails(new Date().toISOString().slice(0, 10)),
		location: restaurantName,
	}));
	const input = inputClass(isDarkTheme);
	const set = <K extends keyof OfferLetterDetails>(key: K, value: OfferLetterDetails[K]) =>
		setDetails((prev) => ({ ...prev, [key]: value }));
	const setEmploymentType = (type: EmploymentType) =>
		setDetails((prev) => ({ ...prev, employmentType: type, securityDeposit: SECURITY_DEPOSIT_BY_TYPE[type] }));
	const valid = details.role.trim() !== "" && details.monthlySalary > 0 && details.joiningDate !== "";

	return (
		<div className={overlay}>
			<div className={`${panelClass(isDarkTheme)} max-w-lg`}>
				<h3 className="font-semibold">Offer letter — {staff.name}</h3>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>Role / designation</span>
						<input className={input} value={details.role} onChange={(e) => set("role", e.target.value)} />
					</label>
					<label className="text-xs space-y-1">
						<span>Employment type</span>
						<select
							className={input}
							value={details.employmentType}
							onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
						>
							<option value="full_time">Full-time</option>
							<option value="part_time">Part-time</option>
						</select>
					</label>
					<label className="text-xs space-y-1">
						<span>Reporting to</span>
						<input className={input} value={details.reportingTo} onChange={(e) => set("reportingTo", e.target.value)} />
					</label>
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>Employee email (optional)</span>
						<input type="email" className={input} value={details.email} onChange={(e) => set("email", e.target.value)} />
					</label>
					<label className="text-xs space-y-1">
						<span>Monthly salary</span>
						<input
							type="number"
							min={0}
							className={input}
							value={details.monthlySalary || ""}
							onChange={(e) => set("monthlySalary", Number(e.target.value))}
						/>
					</label>
					<label className="text-xs space-y-1">
						<span>Refundable security deposit</span>
						<input
							type="number"
							min={0}
							className={input}
							value={details.securityDeposit}
							onChange={(e) => set("securityDeposit", Number(e.target.value))}
						/>
					</label>
					<label className="text-xs space-y-1">
						<span>Joining date</span>
						<input
							type="date"
							className={input}
							value={details.joiningDate}
							onChange={(e) => set("joiningDate", e.target.value)}
						/>
					</label>
					<label className="text-xs space-y-1">
						<span>Accept offer by</span>
						<input
							type="date"
							className={input}
							value={details.acceptByDate}
							onChange={(e) => set("acceptByDate", e.target.value)}
						/>
					</label>
					<label className="text-xs space-y-1">
						<span>Probation (months)</span>
						<input
							type="number"
							min={0}
							className={input}
							value={details.probationMonths}
							onChange={(e) => set("probationMonths", Number(e.target.value))}
						/>
					</label>
					<label className="text-xs space-y-1">
						<span>Notice period (days)</span>
						<input
							type="number"
							min={0}
							className={input}
							value={details.noticeDays}
							onChange={(e) => set("noticeDays", Number(e.target.value))}
						/>
					</label>
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>City / work location (optional)</span>
						<input className={input} value={details.location} onChange={(e) => set("location", e.target.value)} />
					</label>
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>ID proof number (optional)</span>
						<input
							className={input}
							value={details.idProofNumber}
							onChange={(e) => set("idProofNumber", e.target.value)}
						/>
					</label>
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>Issued by (name, title)</span>
						<input className={input} value={details.issuedBy} onChange={(e) => set("issuedBy", e.target.value)} />
					</label>
					<label className="text-xs space-y-1 sm:col-span-2">
						<span>Additional terms (optional)</span>
						<textarea
							rows={3}
							className={input}
							value={details.notes}
							onChange={(e) => set("notes", e.target.value)}
						/>
					</label>
				</div>
				<div className="flex justify-end gap-2">
					<button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-700">
						Cancel
					</button>
					<button
						type="button"
						disabled={!valid || saving}
						onClick={() => onSave(details)}
						className="px-4 py-2 text-sm rounded-lg font-semibold bg-white text-black disabled:opacity-40"
					>
						{saving ? "Saving…" : "Save & preview"}
					</button>
				</div>
			</div>
		</div>
	);
};

interface PreviewModalProps extends ThemeProps {
	doc: StaffDocument;
	staffName: string;
	restaurantName: string;
	currency: string;
	sopUrl?: string;
	onClose: () => void;
}

export const OfferLetterPreviewModal: React.FC<PreviewModalProps> = ({
	isDarkTheme,
	doc,
	staffName,
	restaurantName,
	currency,
	sopUrl,
	onClose,
}) => {
	useEffect(() => {
		document.body.classList.add("printing-offer-letter");
		return () => document.body.classList.remove("printing-offer-letter");
	}, []);

	if (!doc.details) return null;
	const paper = (
		<OfferLetterPaper
			staffName={staffName}
			restaurantName={restaurantName}
			currency={currency}
			issuedOn={doc.createdAt.slice(0, 10)}
			details={doc.details}
			sopUrl={sopUrl}
		/>
	);
	return (
		<div className={overlay}>
			<style>{OFFER_LETTER_PRINT_STYLE}</style>
			<div className={`${panelClass(isDarkTheme)} max-w-2xl`}>
				<div className="flex items-center justify-between gap-2 print:hidden">
					<h3 className="font-semibold">{doc.title}</h3>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => window.print()}
							className="px-4 py-2 text-sm rounded-lg font-semibold bg-white text-black"
						>
							Print / Save PDF
						</button>
						<button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-700">
							Close
						</button>
					</div>
				</div>
				{paper}
			</div>
			{createPortal(<div id="offer-letter-print-portal">{paper}</div>, document.body)}
		</div>
	);
};
