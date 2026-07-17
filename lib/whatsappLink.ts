/** Normalize mobile to wa.me digits (defaults 10-digit Indian numbers to 91 prefix). */
export function normalizeWhatsAppPhone(phone: string): string | null {
	const digits = phone.replace(/\D/g, "");
	if (digits.length === 10) return `91${digits}`;
	if (digits.length === 12 && digits.startsWith("91")) return digits;
	if (digits.length >= 11 && digits.length <= 15) return digits;
	return null;
}

/** Direct WhatsApp chat link for a phone number. */
export function whatsAppChatUrl(phone: string, message?: string): string | null {
	const normalized = normalizeWhatsAppPhone(phone);
	if (!normalized) return null;
	const base = `https://wa.me/${normalized}`;
	if (!message?.trim()) return base;
	const withText = `${base}?text=${encodeURIComponent(message.trim())}`;
	// Dense QRs fail to scan — keep payload short.
	if (withText.length > 400) return base;
	return withText;
}
