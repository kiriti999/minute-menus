import type { JobFlyerContent } from "@minute-menus/types";

/** Short pre-filled WhatsApp text for job flyer QR (long messages break scanning). */
export function buildJobFlyerApplyMessage(jobFlyer: JobFlyerContent, restaurantName: string): string {
	const role = jobFlyer.roleTitle.trim() || "the open role";
	const place = restaurantName.trim() || "your restaurant";
	return `Hi, I'd like to apply for ${role} at ${place}. I can share my CV and availability.`;
}
