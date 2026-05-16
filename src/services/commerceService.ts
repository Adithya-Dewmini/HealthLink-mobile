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
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "preparing"
  | "awaiting_substitution_approval"
  | "partially_ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "rejected";

export type PaymentMethod = "cash" | "online";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export type OrderItemStatus =
  | OrderStatus
  | "available"
  | "partial"
  | "unavailable"
  | "substituted"
  | "fulfilled";

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
  requestedQuantity: number;
  approvedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
  prescriptionItemId: number | null;
  substitutionName: string | null;
  note: string | null;
  imageUrl: string | null;
  requiresPrescription: boolean;
};

export type PaymentSummary = {
  id: number;
  gateway: string;
  gatewayPaymentId: string | null;
  gatewayOrderId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  cardNoMasked: string | null;
  statusMessage: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceSummary = {
  id: number;
  invoiceNo: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  currency: string;
  pdfUrl: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatusSummary = {
  orderId: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  paidAt: string | null;
  amount: number;
  currency: string;
  gatewayPaymentId: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  updatedAt: string | null;
  message: string;
  payment: PaymentSummary | null;
  invoice: InvoiceSummary | null;
};

export type InvoiceDetails = {
  invoice: InvoiceSummary;
  order: {
    id: number;
    orderCode: string | null;
    status: OrderStatus;
    fulfillmentType: "pickup" | "delivery";
    notes: string | null;
    paymentMethod: PaymentMethod | null;
    paymentStatus: PaymentStatus | null;
    paidAt: string | null;
    createdAt: string | null;
  };
  payment: {
    id: number | null;
    gateway: string | null;
    gatewayPaymentId: string | null;
    gatewayOrderId: string | null;
    amount: number;
    currency: string;
    status: string | null;
    method: string | null;
    cardNoMasked: string | null;
    verifiedAt: string | null;
  } | null;
  pharmacy: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  patient: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    requestedQuantity: number;
    approvedQuantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    note: string | null;
  }>;
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
  currency: string;
  fulfillmentType: "pickup" | "delivery";
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  paidAt: string | null;
  notes: string | null;
  pharmacistNote: string | null;
  rejectionReason: string | null;
  deliveryAddress: DeliveryAddress | null;
  deliveryNotes: string | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  payment: PaymentSummary | null;
  invoice: InvoiceSummary | null;
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
  requestedQuantity: Number(item?.requestedQuantity ?? item?.requested_quantity ?? item?.quantity ?? 0),
  approvedQuantity: Number(item?.approvedQuantity ?? item?.approved_quantity ?? item?.quantity ?? 0),
  unitPrice: normalizeMoney(item?.unitPrice ?? item?.unit_price),
  totalPrice: normalizeMoney(item?.totalPrice ?? item?.total_price),
  status: item?.status ?? "pending",
  prescriptionItemId:
    item?.prescriptionItemId === null || item?.prescription_item_id === null
      ? null
      : item?.prescriptionItemId !== undefined || item?.prescription_item_id !== undefined
        ? Number(item?.prescriptionItemId ?? item?.prescription_item_id)
        : null,
  substitutionName:
    typeof item?.substitutionName === "string"
      ? item.substitutionName
      : typeof item?.substitution_name === "string"
        ? item.substitution_name
        : null,
  note: typeof item?.note === "string" ? item.note : null,
  imageUrl:
    typeof item?.imageUrl === "string"
      ? item.imageUrl
      : typeof item?.image_url === "string"
        ? item.image_url
        : null,
  requiresPrescription: Boolean(item?.requiresPrescription ?? item?.requires_prescription),
});

const normalizePayment = (item: any): PaymentSummary | null => {
  if (!item || typeof item !== "object") return null;
  const id = Number(item?.id ?? 0);
  if (!id) return null;
  return {
    id,
    gateway: typeof item?.gateway === "string" ? item.gateway : "payhere",
    gatewayPaymentId:
      typeof item?.gatewayPaymentId === "string"
        ? item.gatewayPaymentId
        : typeof item?.gateway_payment_id === "string"
          ? item.gateway_payment_id
          : null,
    gatewayOrderId:
      typeof item?.gatewayOrderId === "string"
        ? item.gatewayOrderId
        : typeof item?.gateway_order_id === "string"
          ? item.gateway_order_id
          : null,
    amount: normalizeMoney(item?.amount),
    currency:
      typeof item?.currency === "string" && item.currency.trim() ? item.currency : "LKR",
    status: (item?.status ?? "pending") as PaymentStatus,
    method: typeof item?.method === "string" ? item.method : null,
    cardNoMasked:
      typeof item?.cardNoMasked === "string"
        ? item.cardNoMasked
        : typeof item?.card_no_masked === "string"
          ? item.card_no_masked
          : null,
    statusMessage:
      typeof item?.statusMessage === "string"
        ? item.statusMessage
        : typeof item?.status_message === "string"
          ? item.status_message
          : null,
    verifiedAt:
      typeof item?.verifiedAt === "string"
        ? item.verifiedAt
        : typeof item?.verified_at === "string"
          ? item.verified_at
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
  };
};

const normalizeInvoice = (item: any): InvoiceSummary | null => {
  if (!item || typeof item !== "object") return null;
  const id = Number(item?.id ?? 0);
  if (!id) return null;
  return {
    id,
    invoiceNo:
      typeof item?.invoiceNo === "string"
        ? item.invoiceNo
        : typeof item?.invoice_no === "string"
          ? item.invoice_no
          : `HL-INV-${id}`,
    subtotal: normalizeMoney(item?.subtotal),
    deliveryFee: normalizeMoney(item?.deliveryFee ?? item?.delivery_fee),
    serviceFee: normalizeMoney(item?.serviceFee ?? item?.service_fee),
    discount: normalizeMoney(item?.discount),
    total: normalizeMoney(item?.total),
    currency:
      typeof item?.currency === "string" && item.currency.trim() ? item.currency : "LKR",
    pdfUrl:
      typeof item?.pdfUrl === "string"
        ? item.pdfUrl
        : typeof item?.pdf_url === "string"
          ? item.pdf_url
          : null,
    issuedAt:
      typeof item?.issuedAt === "string"
        ? item.issuedAt
        : typeof item?.issued_at === "string"
          ? item.issued_at
          : new Date().toISOString(),
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
  };
};

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
  currency: typeof item?.currency === "string" && item.currency.trim() ? item.currency : "LKR",
  fulfillmentType:
    item?.fulfillmentType === "delivery" || item?.fulfillment_type === "delivery"
      ? "delivery"
      : "pickup",
  paymentMethod:
    item?.paymentMethod === "online" || item?.payment_method === "online"
      ? "online"
      : item?.paymentMethod === "cash" || item?.payment_method === "cash"
        ? "cash"
        : null,
  paymentStatus:
    item?.paymentStatus ?? item?.payment_status ?? null,
  paidAt:
    typeof item?.paidAt === "string"
      ? item.paidAt
      : typeof item?.paid_at === "string"
        ? item.paid_at
        : null,
  notes: typeof item?.notes === "string" ? item.notes : null,
  pharmacistNote:
    typeof item?.pharmacistNote === "string"
      ? item.pharmacistNote
      : typeof item?.pharmacist_note === "string"
        ? item.pharmacist_note
        : null,
  rejectionReason:
    typeof item?.rejectionReason === "string"
      ? item.rejectionReason
      : typeof item?.rejection_reason === "string"
        ? item.rejection_reason
        : null,
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
  payment: normalizePayment(item?.payment),
  invoice: normalizeInvoice(item?.invoice),
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
  paymentMethod?: PaymentMethod;
  deliveryAddress?: DeliveryAddress | null;
  deliveryNotes?: string | null;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
}) => {
  const response = await apiFetch("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      fulfillment_type: input?.fulfillmentType ?? "pickup",
      payment_method: input?.paymentMethod ?? "cash",
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

const normalizePaymentStatusSummary = (item: any): PaymentStatusSummary => ({
  orderId: Number(item?.orderId ?? item?.order_id ?? 0),
  orderStatus: (item?.orderStatus ?? item?.order_status ?? "pending") as OrderStatus,
  paymentMethod:
    item?.paymentMethod === "online" || item?.payment_method === "online"
      ? "online"
      : item?.paymentMethod === "cash" || item?.payment_method === "cash"
        ? "cash"
        : null,
  paymentStatus: (item?.paymentStatus ?? item?.payment_status ?? null) as PaymentStatus | null,
  paidAt:
    typeof item?.paidAt === "string"
      ? item.paidAt
      : typeof item?.paid_at === "string"
        ? item.paid_at
        : null,
  amount: normalizeMoney(item?.amount),
  currency: typeof item?.currency === "string" && item.currency.trim() ? item.currency : "LKR",
  gatewayPaymentId:
    typeof item?.gatewayPaymentId === "string"
      ? item.gatewayPaymentId
      : typeof item?.gateway_payment_id === "string"
        ? item.gateway_payment_id
        : null,
  invoiceId:
    item?.invoiceId === null || item?.invoice_id === null
      ? null
      : item?.invoiceId !== undefined || item?.invoice_id !== undefined
        ? Number(item?.invoiceId ?? item?.invoice_id ?? 0)
        : null,
  invoiceNo:
    typeof item?.invoiceNo === "string"
      ? item.invoiceNo
      : typeof item?.invoice_no === "string"
        ? item.invoice_no
        : null,
  updatedAt:
    typeof item?.updatedAt === "string"
      ? item.updatedAt
      : typeof item?.updated_at === "string"
        ? item.updated_at
        : null,
  message:
    typeof item?.message === "string" && item.message.trim()
      ? item.message
      : "Payment confirmation is still pending.",
  payment: normalizePayment(item?.payment),
  invoice: normalizeInvoice(item?.invoice),
});

const normalizeInvoiceDetails = (item: any): InvoiceDetails => ({
  invoice: normalizeInvoice(item?.invoice) as InvoiceSummary,
  order: {
    id: Number(item?.order?.id ?? 0),
    orderCode:
      typeof item?.order?.orderCode === "string"
        ? item.order.orderCode
        : typeof item?.order?.order_code === "string"
          ? item.order.order_code
          : null,
    status: (item?.order?.status ?? "pending") as OrderStatus,
    fulfillmentType:
      item?.order?.fulfillmentType === "delivery" || item?.order?.fulfillment_type === "delivery"
        ? "delivery"
        : "pickup",
    notes: typeof item?.order?.notes === "string" ? item.order.notes : null,
    paymentMethod:
      item?.order?.paymentMethod === "online" || item?.order?.payment_method === "online"
        ? "online"
        : item?.order?.paymentMethod === "cash" || item?.order?.payment_method === "cash"
          ? "cash"
          : null,
    paymentStatus: (item?.order?.paymentStatus ?? item?.order?.payment_status ?? null) as PaymentStatus | null,
    paidAt:
      typeof item?.order?.paidAt === "string"
        ? item.order.paidAt
        : typeof item?.order?.paid_at === "string"
          ? item.order.paid_at
          : null,
    createdAt:
      typeof item?.order?.createdAt === "string"
        ? item.order.createdAt
        : typeof item?.order?.created_at === "string"
          ? item.order.created_at
          : null,
  },
  payment: item?.payment
    ? {
        id: item.payment.id === null || item.payment.id === undefined ? null : Number(item.payment.id),
        gateway: typeof item.payment.gateway === "string" ? item.payment.gateway : null,
        gatewayPaymentId:
          typeof item.payment.gatewayPaymentId === "string"
            ? item.payment.gatewayPaymentId
            : typeof item.payment.gateway_payment_id === "string"
              ? item.payment.gateway_payment_id
              : null,
        gatewayOrderId:
          typeof item.payment.gatewayOrderId === "string"
            ? item.payment.gatewayOrderId
            : typeof item.payment.gateway_order_id === "string"
              ? item.payment.gateway_order_id
              : null,
        amount: normalizeMoney(item.payment.amount),
        currency:
          typeof item.payment.currency === "string" && item.payment.currency.trim()
            ? item.payment.currency
            : "LKR",
        status: typeof item.payment.status === "string" ? item.payment.status : null,
        method: typeof item.payment.method === "string" ? item.payment.method : null,
        cardNoMasked:
          typeof item.payment.cardNoMasked === "string"
            ? item.payment.cardNoMasked
            : typeof item.payment.card_no_masked === "string"
              ? item.payment.card_no_masked
              : null,
        verifiedAt:
          typeof item.payment.verifiedAt === "string"
            ? item.payment.verifiedAt
            : typeof item.payment.verified_at === "string"
              ? item.payment.verified_at
              : null,
      }
    : null,
  pharmacy: {
    id: Number(item?.pharmacy?.id ?? 0),
    name: String(item?.pharmacy?.name ?? "Pharmacy"),
    phone: typeof item?.pharmacy?.phone === "string" ? item.pharmacy.phone : null,
    email: typeof item?.pharmacy?.email === "string" ? item.pharmacy.email : null,
    address: typeof item?.pharmacy?.address === "string" ? item.pharmacy.address : null,
  },
  patient: {
    id: Number(item?.patient?.id ?? 0),
    name: typeof item?.patient?.name === "string" ? item.patient.name : null,
    email: typeof item?.patient?.email === "string" ? item.patient.email : null,
    phone: typeof item?.patient?.phone === "string" ? item.patient.phone : null,
  },
  items: Array.isArray(item?.items)
    ? item.items.map((entry: any) => ({
        id: Number(entry?.id ?? 0),
        name: String(entry?.name ?? "").trim() || "Order item",
        quantity: Number(entry?.quantity ?? 0),
        requestedQuantity: Number(entry?.requestedQuantity ?? entry?.requested_quantity ?? entry?.quantity ?? 0),
        approvedQuantity: Number(entry?.approvedQuantity ?? entry?.approved_quantity ?? entry?.quantity ?? 0),
        unitPrice: normalizeMoney(entry?.unitPrice ?? entry?.unit_price),
        totalPrice: normalizeMoney(entry?.totalPrice ?? entry?.total_price),
        status: String(entry?.status ?? "pending"),
        note: typeof entry?.note === "string" ? entry.note : null,
      }))
    : [],
});

export const startOrderPaymentCheckout = async (orderId: number | string) => {
  const response = await apiFetch(`/api/payments/pharmacy-orders/${orderId}/checkout`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to start payment checkout"));
  }

  return response.json() as Promise<{
    orderId: number;
    paymentId: number;
    gateway: string;
    checkout_url: string;
    hosted_url: string;
    hosted_token: string;
    fields: Record<string, string>;
  }>;
};

export const getOrderPaymentStatus = async (orderId: number | string) => {
  const response = await apiFetch(`/api/payments/pharmacy-orders/${orderId}/status`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load payment status"));
  }
  const payload = await response.json();
  return normalizePaymentStatusSummary(payload);
};

export const getOrderInvoice = async (orderId: number | string) => {
  const response = await apiFetch(`/api/orders/${orderId}/invoice`);
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load invoice"));
  }
  const payload = await response.json();
  return normalizeInvoiceDetails(payload);
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

export const reviewPharmacyOrder = async (
  orderId: number,
  input: {
    items: Array<{
      orderItemId: number;
      inventoryItemId?: number | null;
      approvedQuantity: number;
      itemStatus: "available" | "partial" | "unavailable" | "substituted";
      substitutionName?: string | null;
      note?: string | null;
    }>;
    pharmacistNote?: string | null;
  }
) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}/review`, {
    method: "POST",
    body: JSON.stringify({
      items: input.items.map((item) => ({
        order_item_id: item.orderItemId,
        inventory_item_id: item.inventoryItemId ?? undefined,
        approved_quantity: item.approvedQuantity,
        item_status: item.itemStatus,
        substitution_name: item.substitutionName ?? undefined,
        note: item.note ?? undefined,
      })),
      pharmacist_note: input.pharmacistNote ?? undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to review order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

export const rejectPharmacyOrder = async (orderId: number, reason: string) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to reject order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

export const completePharmacyOrder = async (orderId: number, note?: string | null) => {
  const response = await apiFetch(`/api/pharmacy/orders/${orderId}/complete`, {
    method: "POST",
    body: JSON.stringify({ note: note?.trim() || undefined }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to complete order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};

export const cancelMyOrder = async (orderId: number | string) => {
  const response = await apiFetch(`/api/orders/${orderId}/cancel`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to cancel order"));
  }

  const payload = await response.json();
  return normalizeOrder(payload?.order ?? {});
};
