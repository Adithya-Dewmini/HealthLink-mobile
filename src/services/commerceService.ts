import { apiFetch } from "../config/api";
import type { ActivityItem } from "./activityService";

export type CartProduct = {
  id: string;
  inventoryItemId: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number;
  discountPrice: number | null;
  requiresPrescription: boolean;
  inStock: boolean;
  stockQuantity: number;
  availableStock: number;
  pharmacyId: number;
};

export type CartItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: CartProduct;
};

export type CartSummary = {
  id: number;
  patientId: number;
  pharmacyId: number | null;
  pharmacyName: string | null;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  items: CartItem[];
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "awaiting_substitution_approval"
  | "partially_ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type DeliveryAddress = {
  line1: string;
  line2?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  landmark?: string | null;
};

export type OrderItem = {
  id: number;
  marketplaceProductId: number;
  inventoryItemId: number;
  substitutedInventoryItemId: number | null;
  substitutionApproved: boolean;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderStatus;
  imageUrl: string | null;
  requiresPrescription: boolean;
};

export type OrderSummary = {
  id: number;
  patientId: number;
  patientName: string | null;
  patientEmail: string | null;
  pharmacyId: number;
  prescriptionId: string | null;
  pharmacyName: string;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  fulfillmentType: "pickup" | "delivery";
  notes: string | null;
  deliveryAddress: DeliveryAddress | null;
  deliveryNotes: string | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

const normalizeMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

const normalizeCartProduct = (item: any): CartProduct => ({
  id: String(item?.id ?? ""),
  inventoryItemId: Number(item?.inventoryItemId ?? item?.inventory_item_id ?? 0),
  name: String(item?.name ?? "").trim() || "Unnamed product",
  genericName:
    typeof item?.genericName === "string"
      ? item.genericName.trim() || null
      : typeof item?.generic_name === "string"
        ? item.generic_name.trim() || null
        : null,
  brand: typeof item?.brand === "string" ? item.brand.trim() || null : null,
  category:
    typeof item?.category === "string"
      ? item.category.trim() || null
      : null,
  imageUrl:
    typeof item?.imageUrl === "string"
      ? item.imageUrl
      : typeof item?.image_url === "string"
        ? item.image_url
        : null,
  price: normalizeMoney(item?.price),
  discountPrice:
    item?.discountPrice === null || item?.discount_price === null
      ? null
      : item?.discountPrice !== undefined || item?.discount_price !== undefined
        ? normalizeMoney(item?.discountPrice ?? item?.discount_price)
        : null,
  requiresPrescription: Boolean(item?.requiresPrescription ?? item?.requires_prescription),
  inStock: Boolean(item?.inStock ?? item?.in_stock),
  stockQuantity: Number(item?.stockQuantity ?? item?.stock_quantity ?? 0),
  availableStock: Number(item?.availableStock ?? item?.available_stock ?? 0),
  pharmacyId: Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
});

const normalizeCartItem = (item: any): CartItem => ({
  id: Number(item?.id ?? 0),
  quantity: Number(item?.quantity ?? 0),
  unitPrice: normalizeMoney(item?.unitPrice ?? item?.unit_price),
  totalPrice: normalizeMoney(item?.totalPrice ?? item?.total_price),
  product: normalizeCartProduct(item?.product ?? {}),
});

const normalizeCart = (item: any): CartSummary => ({
  id: Number(item?.id ?? 0),
  patientId: Number(item?.patientId ?? item?.patient_id ?? 0),
  pharmacyId:
    item?.pharmacyId === null || item?.pharmacy_id === null
      ? null
      : Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
  pharmacyName:
    typeof item?.pharmacyName === "string"
      ? item.pharmacyName
      : typeof item?.pharmacy_name === "string"
        ? item.pharmacy_name
        : null,
  itemCount: Number(item?.itemCount ?? item?.item_count ?? 0),
  subtotal: normalizeMoney(item?.subtotal),
  discountTotal: normalizeMoney(item?.discountTotal ?? item?.discount_total),
  total: normalizeMoney(item?.total),
  items: Array.isArray(item?.items) ? item.items.map(normalizeCartItem) : [],
});

const normalizeOrderItem = (item: any): OrderItem => ({
  id: Number(item?.id ?? 0),
  marketplaceProductId: Number(item?.marketplaceProductId ?? item?.marketplace_product_id ?? 0),
  inventoryItemId: Number(item?.inventoryItemId ?? item?.inventory_item_id ?? 0),
  substitutedInventoryItemId:
    item?.substitutedInventoryItemId === null || item?.substituted_inventory_item_id === null
      ? null
      : Number(item?.substitutedInventoryItemId ?? item?.substituted_inventory_item_id ?? 0),
  substitutionApproved: Boolean(item?.substitutionApproved ?? item?.substitution_approved),
  name: String(item?.name ?? "").trim() || "Order item",
  quantity: Number(item?.quantity ?? 0),
  unitPrice: normalizeMoney(item?.unitPrice ?? item?.unit_price),
  totalPrice: normalizeMoney(item?.totalPrice ?? item?.total_price),
  status: item?.status ?? "pending",
  imageUrl:
    typeof item?.imageUrl === "string"
      ? item.imageUrl
      : typeof item?.image_url === "string"
        ? item.image_url
        : null,
  requiresPrescription: Boolean(item?.requiresPrescription ?? item?.requires_prescription),
});

const normalizeOrder = (item: any): OrderSummary => ({
  id: Number(item?.id ?? 0),
  patientId: Number(item?.patientId ?? item?.patient_id ?? 0),
  patientName:
    typeof item?.patientName === "string"
      ? item.patientName
      : typeof item?.patient_name === "string"
        ? item.patient_name
        : null,
  patientEmail:
    typeof item?.patientEmail === "string"
      ? item.patientEmail
      : typeof item?.patient_email === "string"
        ? item.patient_email
        : null,
  pharmacyId: Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
  prescriptionId:
    item?.prescriptionId === null || item?.prescription_id === null
      ? null
      : String(item?.prescriptionId ?? item?.prescription_id ?? ""),
  pharmacyName:
    typeof item?.pharmacyName === "string"
      ? item.pharmacyName
      : typeof item?.pharmacy_name === "string"
        ? item.pharmacy_name
        : "Pharmacy",
  status: item?.status ?? "pending",
  subtotal: normalizeMoney(item?.subtotal),
  discountTotal: normalizeMoney(item?.discountTotal ?? item?.discount_total),
  total: normalizeMoney(item?.total),
  fulfillmentType:
    item?.fulfillmentType === "delivery" || item?.fulfillment_type === "delivery"
      ? "delivery"
      : "pickup",
  notes: typeof item?.notes === "string" ? item.notes : null,
  deliveryAddress:
    item?.deliveryAddress && typeof item.deliveryAddress === "object"
      ? item.deliveryAddress
      : item?.delivery_address && typeof item.delivery_address === "object"
        ? item.delivery_address
        : null,
  deliveryNotes:
    typeof item?.deliveryNotes === "string"
      ? item.deliveryNotes
      : typeof item?.delivery_notes === "string"
        ? item.delivery_notes
        : null,
  deliveryContactName:
    typeof item?.deliveryContactName === "string"
      ? item.deliveryContactName
      : typeof item?.delivery_contact_name === "string"
        ? item.delivery_contact_name
        : null,
  deliveryContactPhone:
    typeof item?.deliveryContactPhone === "string"
      ? item.deliveryContactPhone
      : typeof item?.delivery_contact_phone === "string"
        ? item.delivery_contact_phone
        : null,
  deliveryStartedAt:
    typeof item?.deliveryStartedAt === "string"
      ? item.deliveryStartedAt
      : typeof item?.delivery_started_at === "string"
        ? item.delivery_started_at
        : null,
  deliveredAt:
    typeof item?.deliveredAt === "string"
      ? item.deliveredAt
      : typeof item?.delivered_at === "string"
        ? item.delivered_at
        : null,
  createdAt:
    typeof item?.createdAt === "string"
      ? item.createdAt
      : typeof item?.created_at === "string"
        ? item.created_at
        : new Date().toISOString(),
  updatedAt:
    typeof item?.updatedAt === "string"
      ? item.updatedAt
      : typeof item?.updated_at === "string"
        ? item.updated_at
        : new Date().toISOString(),
  items: Array.isArray(item?.items) ? item.items.map(normalizeOrderItem) : [],
});

export const getCart = async (): Promise<CartSummary> => {
  const response = await apiFetch("/api/cart");
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load cart"));
  }

  const payload = await response.json();
  return normalizeCart(payload?.cart ?? {});
};

export const addToCart = async (marketplaceProductId: number | string, quantity = 1) => {
  const response = await apiFetch("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({
      marketplace_product_id: Number(marketplaceProductId),
      quantity,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to add product to cart"));
  }

  const payload = await response.json();
  return normalizeCart(payload?.cart ?? {});
};

export const updateCartItem = async (cartItemId: number, quantity: number) => {
  const response = await apiFetch(`/api/cart/items/${cartItemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update cart item"));
  }

  const payload = await response.json();
  return normalizeCart(payload?.cart ?? {});
};

export const removeCartItem = async (cartItemId: number) => {
  const response = await apiFetch(`/api/cart/items/${cartItemId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to remove cart item"));
  }

  const payload = await response.json();
  return normalizeCart(payload?.cart ?? {});
};

export const checkoutCart = async (input?: {
  notes?: string;
  fulfillmentType?: "pickup" | "delivery";
  deliveryAddress?: DeliveryAddress | null;
  deliveryNotes?: string | null;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
}) => {
  const response = await apiFetch("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      fulfillment_type: input?.fulfillmentType ?? "pickup",
      notes: input?.notes?.trim() || undefined,
      delivery_address: input?.deliveryAddress ?? undefined,
      delivery_notes: input?.deliveryNotes?.trim() || undefined,
      delivery_contact_name: input?.deliveryContactName?.trim() || undefined,
      delivery_contact_phone: input?.deliveryContactPhone?.trim() || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to place order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

export const getMyOrders = async () => {
  const response = await apiFetch("/api/orders/my-orders");
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load orders"));
  }

  const payload = await response.json();
  return Array.isArray(payload?.orders) ? payload.orders.map(normalizeOrder) : [];
};

export const getOrderDetails = async (orderId: number | string) => {
  const response = await apiFetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

const normalizeActivityItem = (item: any): ActivityItem => ({
  id: Number(item?.id ?? 0),
  userId: item?.userId === null || item?.user_id === null ? null : Number(item?.userId ?? item?.user_id ?? 0),
  orderId: item?.orderId === null || item?.order_id === null ? null : Number(item?.orderId ?? item?.order_id ?? 0),
  prescriptionId:
    item?.prescriptionId === null || item?.prescription_id === null
      ? null
      : String(item?.prescriptionId ?? item?.prescription_id ?? ""),
  queueId: item?.queueId === null || item?.queue_id === null ? null : Number(item?.queueId ?? item?.queue_id ?? 0),
  type: String(item?.type ?? "activity"),
  title: String(item?.title ?? "Activity"),
  description: typeof item?.description === "string" ? item.description : null,
  metadata:
    item?.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? item.metadata
      : {},
  createdAt:
    typeof item?.createdAt === "string"
      ? item.createdAt
      : typeof item?.created_at === "string"
        ? item.created_at
        : new Date().toISOString(),
});

export const getOrderTimeline = async (orderId: number | string) => {
  const response = await apiFetch(`/api/orders/${orderId}/timeline`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load order timeline"));
  }

  const payload = await response.json();
  return Array.isArray(payload?.timeline) ? payload.timeline.map(normalizeActivityItem) : [];
};

export const getPharmacyOrders = async () => {
  const response = await apiFetch("/api/pharmacy/orders");
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load pharmacy orders"));
  }

  const payload = await response.json();
  return Array.isArray(payload?.orders) ? payload.orders.map(normalizeOrder) : [];
};

export const getPharmacyOrderDetails = async (orderId: number | string) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load pharmacy order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

export const getPharmacyOrderTimeline = async (orderId: number | string) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}/timeline`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load pharmacy order timeline"));
  }

  const payload = await response.json();
  return Array.isArray(payload?.timeline) ? payload.timeline.map(normalizeActivityItem) : [];
};

export const updatePharmacyOrderStatus = async (
  orderId: number,
  status: OrderStatus
) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update order status"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};
