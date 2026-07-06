/** Server-only email HTML templates (inlined for Vercel). */

const EMAIL_SHELL_STYLES = `
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#000;color:#fff;margin:0;padding:0;}
  .wrap{max-width:520px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;}
  .hdr{background:#fff;padding:20px 32px;text-align:center;}.hdr span{font-size:17px;font-weight:900;color:#000;letter-spacing:-0.5px;}
  .body{padding:32px;}.badge{display:inline-block;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:16px;}
  h2{margin:0 0 8px;font-size:22px;color:#fff;}
  p{color:#aaa;font-size:14px;line-height:1.6;margin:0 0 16px;}
  .box{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px 20px;margin:16px 0;}
  .box strong{color:#fff;font-size:16px;display:block;}
  .box span{color:#666;font-size:12px;}
  .ftr{padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;}
  .btn{display:inline-block;background:#fff;color:#000;font-weight:700;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:8px;}
`;

const wrapEmail = (badge: string, badgeColor: string, title: string, bodyHtml: string, footer: string): string =>
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><style>${EMAIL_SHELL_STYLES}</style></head><body>
<div class="wrap"><div class="hdr"><span>MINUTE MENUS</span></div><div class="body">
<div class="badge" style="background:${badgeColor}">${badge}</div>
<h2>${title}</h2>${bodyHtml}</div><div class="ftr">${footer}</div></div></body></html>`;

export const buildSoldOutEmailHtml = (
    dishName: string,
    restaurantName: string,
    reason: "stock" | "manual",
    dashboardUrl = process.env.VITE_SITE_URL ?? "https://minutemenus.com",
): string => {
    const reasonText =
        reason === "manual"
            ? "You manually marked this item as sold out from your dashboard."
            : "This item's daily stock limit has been reached through customer orders.";

    return wrapEmail(
        "Sold Out Alert",
        "#ef4444",
        `"${dishName}" is Sold Out`,
        `<p>${reasonText}</p>
<div class="box"><strong>${dishName}</strong><span>${restaurantName}</span></div>
<p>Customers will see a "Sold Out" badge and the order button will be disabled for this item.</p>
<a class="btn" href="${dashboardUrl}">Go to Dashboard →</a>`,
        `You're receiving this because you own ${restaurantName} on Minute Menus.`,
    );
};

export type CancelOrderEmailParams = {
    restaurantName: string;
    deliveryDate: string;
    dishName: string;
    reason: string;
    customerName: string | null;
    recipient: "customer" | "owner";
};

export const buildCancelOrderEmailHtml = (params: CancelOrderEmailParams): string => {
    const greeting =
        params.recipient === "customer"
            ? `Hi ${params.customerName ?? "there"},`
            : "Order Cancellation Notice";
    const intro =
        params.recipient === "customer"
            ? `We're sorry — ${params.restaurantName} has cancelled your delivery for <strong>${params.deliveryDate}</strong>.`
            : "You have cancelled the following subscription delivery.";
    const outro =
        params.recipient === "customer"
            ? "<p>No charge will be applied for this day. Your subscription continues as normal.</p>"
            : "<p>The customer has been notified (if email was provided).</p>";

    return wrapEmail(
        "Order Cancelled",
        "#ef4444",
        greeting,
        `<p>${intro}</p>
<div class="box"><strong>${params.dishName}</strong><span>Scheduled: ${params.deliveryDate}</span></div>
<p><strong>Reason:</strong> ${params.reason}</p>${outro}`,
        "Sent by Minute Menus subscription service.",
    );
};

export type DigestOrderRow = {
    customerName: string;
    phone: string;
    dishName: string;
    timeSlotLabel: string;
    deliveryType: string;
};

export const buildDailyDigestEmailHtml = (
    tomorrowStr: string,
    orderCount: number,
    rows: DigestOrderRow[],
): string => {
    const tableRows = rows
        .map(
            (row) => `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${row.customerName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${row.phone}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${row.dishName}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${row.timeSlotLabel}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${row.deliveryType}</td>
            </tr>`,
        )
        .join("");

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#000;color:#fff;margin:0;padding:0;}
  .wrap{max-width:680px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;}
  .hdr{background:#fff;padding:20px 32px;}.hdr span{font-size:17px;font-weight:900;color:#000;}
  .body{padding:32px;}.badge{display:inline-block;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:16px;}
  h2{margin:0 0 6px;font-size:20px;color:#fff;}p{color:#aaa;font-size:14px;line-height:1.6;margin:0 0 16px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}
  th{text-align:left;padding:8px 12px;background:#1a1a1a;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
  td{color:#fff;font-size:13px;}.ftr{padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;}
</style></head><body>
<div class="wrap"><div class="hdr"><span>MINUTE MENUS</span></div><div class="body">
<div class="badge">Daily Digest</div>
<h2>Tomorrow's Orders — ${tomorrowStr}</h2>
<p>${orderCount} subscriber${orderCount !== 1 ? "s" : ""} have selected their meal for tomorrow.</p>
<table><thead><tr><th>Customer</th><th>Phone</th><th>Dish</th><th>Time Slot</th><th>Type</th></tr></thead>
<tbody>${tableRows}</tbody></table></div>
<div class="ftr">Please prepare these items for delivery tomorrow. Sent by Minute Menus.</div></div></body></html>`;
};

export const TIME_SLOT_LABELS: Record<string, string> = {
    "08-09": "8:00 AM – 9:00 AM",
    "12-14": "12:00 PM – 2:00 PM",
    "19-21": "7:00 PM – 9:00 PM",
};

export const formatFromRestaurant = (restaurantName: string, fromEmail?: string): string =>
    `${restaurantName} via Minute Menus <${fromEmail ?? process.env.FROM_EMAIL ?? "onboarding@resend.dev"}>`;
