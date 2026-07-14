import Razorpay from "razorpay";

export type RazorpayCreds = { keyId: string; keySecret: string };

export const getRazorpayCredentials = (): RazorpayCreds | null => {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) return null;
	return { keyId, keySecret };
};

export const createRazorpayClient = (): Razorpay => {
	const creds = getRazorpayCredentials();
	if (!creds) throw new Error("Razorpay not configured");
	return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
};

export type CounterRazorpayArtifacts = {
	orderId: string;
	qrId: string;
	qrImageUrl: string;
	paymentLinkId: string;
	paymentLinkUrl: string;
};

export async function createCounterRazorpayArtifacts(input: {
	amountPaise: number;
	currency: string;
	invoiceId: string;
	invoiceLabel: string;
	restaurantId: string;
	customerPhone?: string | null;
}): Promise<CounterRazorpayArtifacts> {
	const razorpay = createRazorpayClient();
	const closeBy = Math.floor(Date.now() / 1000) + 60 * 45;

	const order = await razorpay.orders.create({
		amount: input.amountPaise,
		currency: input.currency,
		receipt: `inv_${input.invoiceId.slice(0, 8)}`,
		notes: {
			type: "counter_invoice",
			invoiceId: input.invoiceId,
			restaurantId: input.restaurantId,
			invoiceLabel: input.invoiceLabel,
		},
	});

	const qr = await razorpay.qrCode.create({
		type: "upi_qr",
		name: input.invoiceLabel,
		usage: "single_use",
		fixed_amount: true,
		payment_amount: input.amountPaise,
		description: `Bill ${input.invoiceLabel}`,
		close_by: closeBy,
		notes: {
			type: "counter_invoice",
			invoiceId: input.invoiceId,
			orderId: order.id,
		},
	});

	const link = await razorpay.paymentLink.create({
		amount: input.amountPaise,
		currency: input.currency,
		description: `Bill ${input.invoiceLabel}`,
		reference_id: input.invoiceId,
		accept_partial: false,
		notify: { sms: false, email: false },
		reminder_enable: false,
		notes: {
			type: "counter_invoice",
			invoiceId: input.invoiceId,
			orderId: order.id,
		},
		...(input.customerPhone
			? { customer: { contact: input.customerPhone.replace(/\D/g, "").slice(-10) } }
			: {}),
	});

	const qrRecord = qr as { id: string; image_url?: string };
	const linkRecord = link as { id: string; short_url?: string };

	return {
		orderId: order.id,
		qrId: qrRecord.id,
		qrImageUrl: qrRecord.image_url ?? "",
		paymentLinkId: linkRecord.id,
		paymentLinkUrl: linkRecord.short_url ?? "",
	};
}
