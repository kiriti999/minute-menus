import type React from "react";
import type { OfferLetterDetails } from "@minute-menus/types";

const LOCALE = "en-IN";

export const OFFER_LETTER_PRINT_STYLE = `
@media print {
	body.printing-offer-letter * { visibility: hidden; }
	body.printing-offer-letter #offer-letter-print-root,
	body.printing-offer-letter #offer-letter-print-root * { visibility: visible; }
	body.printing-offer-letter #offer-letter-print-root {
		position: absolute;
		inset: 0;
		box-shadow: none;
	}
}
`;

function formatDate(iso: string): string {
	if (!iso) return "—";
	return new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE, {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatSalary(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${currency} ${amount}`;
	}
}

interface OfferLetterPaperProps {
	staffName: string;
	restaurantName: string;
	currency: string;
	issuedOn: string;
	details: OfferLetterDetails;
}

export const OfferLetterPaper: React.FC<OfferLetterPaperProps> = ({
	staffName,
	restaurantName,
	currency,
	issuedOn,
	details,
}) => (
	<div
		id="offer-letter-print-root"
		className="bg-white text-black p-8 sm:p-12 text-sm leading-relaxed space-y-4 rounded-lg shadow"
	>
		<div className="flex items-start justify-between gap-4">
			<h2 className="text-xl font-semibold">{restaurantName}</h2>
			<p className="text-xs text-zinc-600">Date: {formatDate(issuedOn)}</p>
		</div>
		<p className="font-semibold uppercase tracking-wide text-center">Offer of Employment</p>
		<p>Dear {staffName},</p>
		<p>
			We are pleased to offer you the position of <strong>{details.role}</strong> at{" "}
			<strong>{restaurantName}</strong>, based at {details.location || restaurantName}.
		</p>
		<ul className="list-disc pl-5 space-y-1">
			<li>Date of joining: {formatDate(details.joiningDate)}</li>
			<li>Monthly salary: {formatSalary(details.monthlySalary, currency)}</li>
			{details.probationMonths > 0 && <li>Probation period: {details.probationMonths} month(s)</li>}
			<li>Notice period: {details.noticeDays} day(s)</li>
		</ul>
		{details.notes && <p className="whitespace-pre-wrap">{details.notes}</p>}
		<p>Please sign and return a copy of this letter to confirm your acceptance.</p>
		<div className="grid grid-cols-2 gap-8 pt-10">
			<div>
				<div className="border-t border-black pt-1">{details.issuedBy || "Authorised signatory"}</div>
				<div className="text-xs text-zinc-600">For {restaurantName}</div>
			</div>
			<div>
				<div className="border-t border-black pt-1">{staffName}</div>
				<div className="text-xs text-zinc-600">Accepted by employee</div>
			</div>
		</div>
	</div>
);
