import type { OrderStatus } from "@minute-menus/types";

export const CUSTOMER_STATUS_COPY: Record<OrderStatus, { label: string; message: string }> = {
  pending: { label: "Placed", message: "Waiting for the restaurant to accept your order." },
  confirmed: { label: "Accepted", message: "The restaurant has accepted your order." },
  preparing: { label: "Preparing", message: "Your order is being prepared." },
  ready: { label: "Ready", message: "Your order is ready for pickup / on its way." },
  completed: { label: "Completed", message: "Order completed. Enjoy!" },
  rejected: { label: "Rejected", message: "The restaurant could not fulfil this order." },
};

export const ORDER_STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed"];

export const isOrderInFlight = (status: OrderStatus): boolean => status !== "completed" && status !== "rejected";
