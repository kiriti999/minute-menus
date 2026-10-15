import type { CustomerOrder } from "@minute-menus/types";

const PAGE_MARGIN = 15;
const ROW_HEIGHT = 7;

const formatAmount = (currency: string, value: number): string => `${currency.toUpperCase()} ${value.toFixed(2)}`;

const formatInvoiceDate = (value: string): string =>
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
        new Date(value),
    );

export const orderNumber = (order: CustomerOrder): string => order.id.slice(0, 8).toUpperCase();

const resolveTotals = (order: CustomerOrder) => {
    const itemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const subtotal = order.subtotalAmount ?? itemsSubtotal;
    const gst = order.gstAmount ?? Math.max(0, order.totalAmount - subtotal);
    return { subtotal, gst };
};

/** Builds and downloads a PDF invoice for a completed order. jsPDF is loaded on demand. */
export const downloadOrderInvoice = async (order: CustomerOrder, currency: string): Promise<void> => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const right = pageWidth - PAGE_MARGIN;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(order.restaurantName, PAGE_MARGIN, y);
    doc.setFontSize(12);
    doc.text("INVOICE", right, y, { align: "right" });

    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Order #${orderNumber(order)}`, PAGE_MARGIN, y);
    doc.text(formatInvoiceDate(order.createdAt), right, y, { align: "right" });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Item", PAGE_MARGIN, y);
    doc.text("Qty", 120, y, { align: "right" });
    doc.text("Price", 150, y, { align: "right" });
    doc.text("Amount", right, y, { align: "right" });
    doc.line(PAGE_MARGIN, y + 2, right, y + 2);

    y += ROW_HEIGHT;
    doc.setFont("helvetica", "normal");
    for (const item of order.items) {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        const label = item.variantName ? `${item.name} (${item.variantName})` : item.name;
        doc.text(doc.splitTextToSize(label, 85)[0], PAGE_MARGIN, y);
        doc.text(String(item.quantity), 120, y, { align: "right" });
        doc.text(item.price.toFixed(2), 150, y, { align: "right" });
        doc.text((item.price * item.quantity).toFixed(2), right, y, { align: "right" });
        y += ROW_HEIGHT;
    }

    const { subtotal, gst } = resolveTotals(order);
    doc.line(PAGE_MARGIN, y - 3, right, y - 3);
    y += 2;
    doc.text("Subtotal", 150, y, { align: "right" });
    doc.text(formatAmount(currency, subtotal), right, y, { align: "right" });
    y += ROW_HEIGHT;
    doc.text("GST", 150, y, { align: "right" });
    doc.text(formatAmount(currency, gst), right, y, { align: "right" });
    y += ROW_HEIGHT;
    doc.setFont("helvetica", "bold");
    doc.text("Total", 150, y, { align: "right" });
    doc.text(formatAmount(currency, order.totalAmount), right, y, { align: "right" });

    doc.save(`invoice-${orderNumber(order)}.pdf`);
};
