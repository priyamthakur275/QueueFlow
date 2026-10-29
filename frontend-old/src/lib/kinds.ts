import type { VenueKind } from "../types";

export const kindMeta: Record<VenueKind, { label: string; plural: string; path: string; tint: string; text: string }> = {
  HOSPITAL: { label: "Hospital", plural: "Hospitals", path: "/hospitals", tint: "bg-care-50", text: "text-care-600" },
  SHOP: { label: "Shop", plural: "Shops", path: "/shops", tint: "bg-shop-50", text: "text-shop-600" },
  HOTEL: { label: "Hotel", plural: "Hotels", path: "/hotels", tint: "bg-stay-50", text: "text-stay-600" },
};

