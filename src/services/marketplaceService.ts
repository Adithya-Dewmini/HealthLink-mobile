import { apiFetch } from "../config/api";

export type MarketplaceStoreProduct = {
  id: string;
  inventoryItemId: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number;
  discountPrice: number | null;
  requiresPrescription: boolean;
  isFeatured: boolean;
  isActive: boolean;
  inStock: boolean;
  stockQuantity: number;
  pharmacyId: number;
};

export type MarketplaceStore = {
  pharmacy: {
    id: number;
    name: string;
    location: string | null;
    imageUrl: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    rating: number | null;
    status: string | null;
    verificationStatus: string;
  };
  categories: string[];
  featuredProducts: MarketplaceStoreProduct[];
  products: MarketplaceStoreProduct[];
};

const normalizeMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const normalizeProduct = (item: any): MarketplaceStoreProduct => ({
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
  description:
    typeof item?.description === "string" ? item.description.trim() || null : null,
  category:
    typeof item?.category === "string" ? item.category.trim() || null : null,
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
  isFeatured: Boolean(item?.isFeatured ?? item?.is_featured),
  isActive: Boolean(item?.isActive ?? item?.is_active),
  inStock: Boolean(item?.inStock ?? item?.in_stock),
  stockQuantity: Number(item?.stockQuantity ?? item?.stock_quantity ?? 0),
  pharmacyId: Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
});

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

export const getPharmacyStore = async (
  pharmacyId: number | string
): Promise<MarketplaceStore> => {
  const response = await apiFetch(
    `/api/marketplace/pharmacies/${encodeURIComponent(String(pharmacyId))}/store`
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load pharmacy storefront"));
  }

  const payload = await response.json();
  return {
    pharmacy: {
      id: Number(payload?.pharmacy?.id ?? pharmacyId),
      name: String(payload?.pharmacy?.name ?? "").trim() || "Pharmacy",
      location:
        typeof payload?.pharmacy?.location === "string" ? payload.pharmacy.location : null,
      imageUrl:
        typeof payload?.pharmacy?.imageUrl === "string" ? payload.pharmacy.imageUrl : null,
      logoUrl:
        typeof payload?.pharmacy?.logoUrl === "string" ? payload.pharmacy.logoUrl : null,
      coverImageUrl:
        typeof payload?.pharmacy?.coverImageUrl === "string"
          ? payload.pharmacy.coverImageUrl
          : null,
      rating:
        payload?.pharmacy?.rating === null || payload?.pharmacy?.rating === undefined
          ? null
          : Number(payload.pharmacy.rating),
      status:
        typeof payload?.pharmacy?.status === "string" ? payload.pharmacy.status : null,
      verificationStatus:
        typeof payload?.pharmacy?.verificationStatus === "string"
          ? payload.pharmacy.verificationStatus
          : "pending",
    },
    categories: Array.isArray(payload?.categories)
      ? payload.categories.filter((item: unknown): item is string => typeof item === "string")
      : [],
    featuredProducts: Array.isArray(payload?.featuredProducts)
      ? payload.featuredProducts.map(normalizeProduct)
      : [],
    products: Array.isArray(payload?.products)
      ? payload.products.map(normalizeProduct)
      : [],
  };
};

export const searchMarketplaceProducts = async (query: string) => {
  const response = await apiFetch(
    `/api/marketplace/products/search?q=${encodeURIComponent(query.trim())}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to search marketplace products"));
  }

  const payload = await response.json();
  return Array.isArray(payload?.items) ? payload.items.map(normalizeProduct) : [];
};

export const getProductDetails = async (productId: number | string) => {
  const response = await apiFetch(
    `/api/marketplace/products/${encodeURIComponent(String(productId))}`
  );

  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load product details"));
  }

  const payload = await response.json();
  return normalizeProduct(payload);
};
