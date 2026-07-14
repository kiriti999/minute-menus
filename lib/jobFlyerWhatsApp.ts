import type { JobFlyerContent } from "@minute-menus/types";

/** Pre-filled WhatsApp message when a candidate scans the job flyer QR. */
export function buildJobFlyerApplyMessage(jobFlyer: JobFlyerContent, restaurantName: string): string {
	const role = jobFlyer.roleTitle.trim() || "part-time";
	const place = restaurantName.trim() || "your restaurant";
	const schedule = jobFlyer.timings.trim() || "the listed hours";
	return [
		`Hi, I'd like to apply for the ${role} role at ${place}.`,
		"",
		"Please confirm:",
		`1. I can work ${schedule}.`,
		"2. My location: ",
		"3. I can commute home safely after my shift.",
		"",
		"(CV attached if available)",
	].join("\n");
}
