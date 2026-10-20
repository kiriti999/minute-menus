import type { EmploymentType, OfferLetterDetails } from "@minute-menus/types";

/** Refundable security deposit, withheld from salary and returned at relieving. */
export const SECURITY_DEPOSIT_BY_TYPE: Record<EmploymentType, number> = {
	full_time: 4000,
	part_time: 2000,
};

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
	full_time: "Full-time",
	part_time: "Part-time",
};

export interface LetterClause {
	title: string;
	body: string;
}

/** Duties mirror the Kitchen SOP (lib/sop/sopData.ts) — keep the two in step. */
export const RESPONSIBILITIES: LetterClause[] = [
	{
		title: "Cleanliness & Hygiene",
		body: "Maintain a clean kitchen in line with the Kitchen SOP: hair net and gloves at all times while handling food, spray and clean as you go, wash utensils as you go, sweep and mop daily, change bins when required and keep lids closed, and complete the weekly deep clean and monthly ceiling clean.",
	},
	{
		title: "Food Safety",
		body: "Date and label every item and food without fail, refill stock using FIFO, and check food temperatures after cooking to confirm it is fully cooked.",
	},
	{
		title: "Inventory Management",
		body: "Monitor food, cleaning chemicals and packaging stock, refill prep items for the next shift, and list items to order at least two days ahead to prevent stock-outs.",
	},
	{
		title: "Operational Logs",
		body: "Maintain precise records, including temperature logs (at least twice per shift) and ingredient labels, and scan your QR badge to log in on entry and log out on exit for every shift.",
	},
	{
		title: "Customer & Order Handling",
		body: "Manage order intake (offline and digital), pack deliveries accurately, and promote offline sales by giving customers the menu and QR code for direct orders and subscriptions.",
	},
	{
		title: "Reporting",
		body: "Report any issue with the kitchen environment or equipment immediately.",
	},
	{
		title: "Security & Asset Management",
		body: "You will be provided with shop keys to manage opening and closing. You are responsible for turning off the gas and fully securing the premises at the end of each business day, and for caring for all company equipment; you shall be held liable for any damage resulting from negligence or misuse.",
	},
];

export const ONBOARDING_DOCUMENTS: string[] = [
	"Government-issued photo identification",
	"Proof of address",
	"Copies of educational qualifications / certificates",
	"Bank account details for salary processing",
];

export const ATTENDANCE_CLAUSE =
	"Shift timings cannot be changed without prior notice. Unplanned leaves are subject to loss of pay along with a penalty for business loss, and a no-show is marked as an absence with the same penalty. Absence without notice for 2 days may be treated as termination, unless it is an emergency supported by proper medical or other documents.";

export const WORK_SCHEDULE_CLAUSE =
	"Shifts will be scheduled based on kitchen operational requirements, including weekends and public holidays as necessitated by the business.";

function addDaysIso(iso: string, days: number): string {
	const d = new Date(`${iso}T00:00:00`);
	d.setDate(d.getDate() + days);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultOfferLetterDetails(todayIso: string): OfferLetterDetails {
	return {
		role: "",
		employmentType: "full_time",
		email: "",
		reportingTo: "Kitchen Manager / Owner",
		monthlySalary: 0,
		securityDeposit: SECURITY_DEPOSIT_BY_TYPE.full_time,
		joiningDate: todayIso,
		acceptByDate: addDaysIso(todayIso, 2),
		location: "",
		probationMonths: 6,
		noticeDays: 30,
		idProofNumber: "",
		issuedBy: "",
		notes: "",
	};
}
