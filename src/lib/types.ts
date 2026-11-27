import type { CategoryId, ConditionId } from "./constants";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  city: string;
  phone: string;
  createdAt: string;
}

/** Цифровой паспорт материала (AI-5). Заполняется после AI-анализа. */
export interface Passport {
  materialType: string;
  visualCondition: string;
  visibleDefects: string[];
  recoveryRecommendations: string[];
  reuseRecommendations: string[];
  /** ai_suggested — предположение ИИ, user_confirmed — продавец проверил */
  verificationStatus: "ai_suggested" | "user_confirmed";
  createdAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: CategoryId;
  price: number;
  quantity: number;
  unit: string;
  condition: ConditionId;
  city: string;
  status: "active" | "sold";
  images: string[];
  passport?: Passport;
  createdAt: string;
  updatedAt: string;
}

export interface ListingWithSeller extends Listing {
  seller: Pick<Profile, "id" | "fullName" | "phone" | "city">;
}

export type ListingInput = Omit<Listing, "id" | "sellerId" | "createdAt" | "updatedAt" | "status"> & {
  status?: Listing["status"];
};

export interface ListingFilters {
  q?: string;
  category?: string;
  city?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "new" | "price_asc" | "price_desc";
}
