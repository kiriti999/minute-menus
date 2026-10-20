import type React from "react";
import type { OfferLetterDetails } from "@minute-menus/types";
import {
	ATTENDANCE_CLAUSE,
	EMPLOYMENT_TYPE_LABEL,
	ONBOARDING_DOCUMENTS,
	RESPONSIBILITIES,
	WORK_SCHEDULE_CLAUSE,
} from "../../lib/offerLetterTemplate";

const LOCALE = "en-IN";

/** The print copy is portaled to <body>; everything else is hidden so the letter can span pages. */
export const OFFER_LETTER_PRINT_STYLE = `
#offer-letter-print-portal { display: none; }
@media print {
	body.printing-offer-letter { overflow: visible !important; height: auto !important; background: #fff !important; }
	body.printing-offer-letter > *:not(#offer-letter-print-portal) { display: none !important; }
	body.printing-offer-letter #offer-letter-print-portal { display: block; }
	body.printing-offer-letter #offer-letter-print-portal > div { box-shadow: none; border-radius: 0; }
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

function formatMoney(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${currency} ${amount}`;
	}
}

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<h3 className="text-base font-semibold text-sky-700 border-b border-zinc-300 pb-1 pt-2">{children}</h3>
);

const Clause: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<li className="break-inside-avoid">
		<strong>{title}:</strong> {children}
	</li>
);

interface OfferLetterPaperProps {
	staffName: string;
	restaurantName: string;
	currency: string;
	issuedOn: string;
	details: OfferLetterDetails;
	sopUrl?: string;
}

export const OfferLetterPaper: React.FC<OfferLetterPaperProps> = ({
	staffName,
	restaurantName,
	currency,
	issuedOn,
	details,
	sopUrl,
}) => (
	<div className="bg-white text-black p-8 sm:p-12 text-sm leading-relaxed space-y-3 rounded-lg shadow">
		<div className="text-center">
			<h2 className="text-2xl font-bold uppercase tracking-wide">{restaurantName}</h2>
			<p className="text-zinc-500">Offer of Employment</p>
		</div>
		<div className="space-y-0.5">
			<p>
				<strong>Date:</strong> {formatDate(issuedOn)}
			</p>
			<p>
				<strong>To:</strong> {staffName}
			</p>
			{details.email && (
				<p>
					<strong>Email:</strong> {details.email}
				</p>
			)}
		</div>
		<p>Dear {staffName},</p>
		<p>
			We are pleased to offer you the position of <strong>{details.role}</strong> at{" "}
			<strong>{restaurantName}</strong>. We are impressed with your background and believe you will be a valuable
			addition to our team as we continue to grow our operations
			{details.location ? ` in ${details.location}` : ""}.
		</p>

		<Heading>Position Details</Heading>
		<ul className="list-disc pl-5 space-y-1">
			<li>
				<strong>Role:</strong> {details.role}
			</li>
			<li>
				<strong>Employment Type:</strong> {EMPLOYMENT_TYPE_LABEL[details.employmentType]}
			</li>
			<li>
				<strong>Company:</strong> {restaurantName}
			</li>
			<li>
				<strong>Reporting To:</strong> {details.reportingTo}
			</li>
			<li>
				<strong>Start Date:</strong> {formatDate(details.joiningDate)}
			</li>
		</ul>

		<Heading>Key Responsibilities &amp; Standards</Heading>
		<p>
			In this role, you will be responsible for the highest standards of operational excellence. You agree to follow
			the Kitchen SOP, which forms part of this offer
			{sopUrl ? ` (${sopUrl})` : ""}. Your core duties include:
		</p>
		<ul className="list-disc pl-5 space-y-1">
			{RESPONSIBILITIES.map((item) => (
				<Clause key={item.title} title={item.title}>
					{item.body}
				</Clause>
			))}
		</ul>

		<Heading>Onboarding Requirements</Heading>
		<p>To complete your formal induction, please email us the following documents or provide them on your first day:</p>
		<ul className="list-disc pl-5 space-y-1">
			{ONBOARDING_DOCUMENTS.map((doc) => (
				<li key={doc}>{doc}</li>
			))}
			{details.idProofNumber && (
				<li>
					<strong>ID Proof:</strong> {details.idProofNumber}
				</li>
			)}
		</ul>

		<Heading>Compensation and Terms</Heading>
		<ul className="list-disc pl-5 space-y-1">
			<Clause title="Salary">
				{formatMoney(details.monthlySalary, currency)} per month, subject to standard deductions.
			</Clause>
			<Clause title="Probation Period & Performance">
				{details.probationMonths} month(s). During this period your performance will be evaluated to ensure alignment
				with our operational standards. The company holds the right to review performance and take necessary actions.
			</Clause>
			<Clause title="Attendance & Conduct">{ATTENDANCE_CLAUSE}</Clause>
			<Clause title="Security Deposit">
				A refundable security deposit of {formatMoney(details.securityDeposit, currency)} (
				{EMPLOYMENT_TYPE_LABEL[details.employmentType].toLowerCase()}) will be withheld from your salary and refunded
				at the time of relieving.
			</Clause>
			<Clause title="Notice Period">
				A minimum notice period of {details.noticeDays} days is required to prevent business losses. Upon receipt of a
				resignation, {restaurantName} will manage the Full and Final (F&amp;F) settlement process.
			</Clause>
			<Clause title="Work Schedule">{WORK_SCHEDULE_CLAUSE}</Clause>
		</ul>
		{details.notes && <p className="whitespace-pre-wrap">{details.notes}</p>}

		<div className="break-inside-avoid space-y-3">
			<Heading>Acceptance</Heading>
			<p>
				Please confirm your acceptance of this offer by signing and returning a copy of this letter by{" "}
				{formatDate(details.acceptByDate)}.
			</p>
			<p>
				If you have any questions regarding your responsibilities or the terms of this offer, please feel free to reach
				out to me directly.
			</p>
			<p className="pt-2">Sincerely,</p>
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
	</div>
);
