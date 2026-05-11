import { apiFetch } from "../config/api";

export type PharmacyAnalyticsDashboard = {
  overview: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    fulfillmentSuccessRate: number;
    cancellationRate: number;
    prescriptionVolume: number;
  };
  topMedicines: Array<{
    medicineId: number;
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  lowStockMedicines: Array<{
    medicineId: number;
    name: string;
    quantity: number;
    reservedQuantity: number;
    availableStock: number;
  }>;
  orderTrends: Array<{
    date: string;
    orderCount: number;
    revenue: number;
  }>;
  forecastHighlights: Array<{
    medicineId: number;
    name: string;
    predictedDemand: number;
    recommendedReorderQuantity: number;
    shortageRisk: "low" | "medium" | "high";
  }>;
};

const parseError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null);
  return typeof data?.message === "string" && data.message.trim() ? data.message : fallback;
};

export const getPharmacyAnalyticsDashboard = async (): Promise<PharmacyAnalyticsDashboard> => {
  const response = await apiFetch("/api/pharmacy/analytics/dashboard");
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to load pharmacy analytics"));
  }
  return response.json();
};
