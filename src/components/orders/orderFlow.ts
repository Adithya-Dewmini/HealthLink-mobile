import type { OrderStatus, OrderSummary } from "../../services/commerceService";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  awaiting_substitution_approval: "Awaiting substitution",
  partially_ready: "Partially ready",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; bg: string; color: string; icon: string }
> = {
  pending: { label: "Pending", bg: "#FEF3C7", color: "#92400E", icon: "time-outline" },
  confirmed: { label: "Confirmed", bg: "#DBEAFE", color: "#1D4ED8", icon: "checkmark-done-outline" },
  preparing: { label: "Preparing", bg: "#EDE9FE", color: "#6D28D9", icon: "medkit-outline" },
  awaiting_substitution_approval: {
    label: "Awaiting substitution",
    bg: "#FDE68A",
    color: "#92400E",
    icon: "swap-horizontal-outline",
  },
  partially_ready: {
    label: "Partially ready",
    bg: "#FFEDD5",
    color: "#C2410C",
    icon: "alert-circle-outline",
  },
  ready_for_pickup: { label: "Ready for pickup", bg: "#DCFCE7", color: "#166534", icon: "bag-check-outline" },
  out_for_delivery: { label: "Out for delivery", bg: "#DBEAFE", color: "#1D4ED8", icon: "bicycle-outline" },
  delivered: { label: "Delivered", bg: "#D1FAE5", color: "#065F46", icon: "home-outline" },
  completed: { label: "Completed", bg: "#E7F7EF", color: "#0F8A5F", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#B91C1C", icon: "close-circle-outline" },
};

const ORDER_TRANSITIONS: Record<OrderSummary["fulfillmentType"], Record<OrderStatus, OrderStatus[]>> = {
  pickup: {
    pending: ["confirmed", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    confirmed: ["preparing", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    preparing: ["ready_for_pickup", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    awaiting_substitution_approval: ["confirmed", "preparing", "partially_ready", "cancelled"],
    partially_ready: ["ready_for_pickup", "awaiting_substitution_approval", "completed", "cancelled"],
    ready_for_pickup: ["completed", "cancelled"],
    out_for_delivery: [],
    delivered: [],
    completed: [],
    cancelled: [],
  },
  delivery: {
    pending: ["confirmed", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    confirmed: ["preparing", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    preparing: ["out_for_delivery", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    awaiting_substitution_approval: ["confirmed", "preparing", "partially_ready", "cancelled"],
    partially_ready: ["out_for_delivery", "awaiting_substitution_approval", "cancelled"],
    ready_for_pickup: [],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    completed: [],
    cancelled: [],
  },
};

export const getAllowedNextStatuses = (order: Pick<OrderSummary, "status" | "fulfillmentType">) =>
  ORDER_TRANSITIONS[order.fulfillmentType][order.status] ?? [];

export const getTimelineSteps = (order: Pick<OrderSummary, "fulfillmentType">) =>
  order.fulfillmentType === "delivery"
    ? (["pending", "confirmed", "preparing", "out_for_delivery", "delivered"] as OrderStatus[])
    : (["pending", "confirmed", "preparing", "ready_for_pickup", "completed"] as OrderStatus[]);

export const getActiveTimelineStatuses = (order: Pick<OrderSummary, "status" | "fulfillmentType">) => {
  if (order.status === "awaiting_substitution_approval") {
    return ["pending", "confirmed"] as OrderStatus[];
  }
  if (order.status === "partially_ready") {
    return ["pending", "confirmed", "preparing"] as OrderStatus[];
  }
  if (order.status === "cancelled") {
    return ["pending"] as OrderStatus[];
  }

  const steps = getTimelineSteps(order);
  const activeIndex = steps.indexOf(order.status);
  return activeIndex === -1 ? (["pending"] as OrderStatus[]) : steps.slice(0, activeIndex + 1);
};
