/**
 * Бэкенд на Supabase: Postgres + Auth + Storage.
 * Схема и права доступа — supabase/schema.sql.
 */
import { createClient } from "@supabase/supabase-js";
import type { Listing, ListingFilters, ListingInput, ListingWithSeller, Passport, Profile } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;
const db = () => supabase!;

const LISTING_SELECT =
  "*, listing_images(image_url, position), material_passports(*), seller:profiles(id, full_name, phone, city)";

/* ---------- Ошибки на русском ---------- */

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Неверный email или пароль"],
  [/already registered|already exists/i, "Пользователь с таким email уже зарегистрирован"],
  [/email not confirmed/i, "Email не подтверждён. Отключите подтверждение email в настройках Supabase"],
  [/password should be at least/i, "Пароль должен быть не короче 6 символов"],
  [/rate limit/i, "Слишком много попыток, подождите минуту"],
  [/row-level security|permission denied/i, "Нет прав на это действие"],
  [/failed to fetch|network/i, "Нет связи с сервером. Проверьте интернет"],
];

function fail(error: { message: string } | null | undefined): asserts error is null | undefined {
  if (!error) return;
  const hit = MESSAGES.find(([re]) => re.test(error.message));
  throw new Error(hit ? hit[1] : `Ошибка сервера: ${error.message}`);
}

/* ---------- Преобразование строк БД в типы приложения ---------- */

type Row = Record<string, any>;

const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

function mapProfile(r: Row): Profile {
  return { id: r.id, fullName: r.full_name ?? "", email: r.email ?? "", city: r.city ?? "", phone: r.phone ?? "", createdAt: r.created_at };
}

function mapPassport(r: Row | undefined): Passport | undefined {
  if (!r) return undefined;
  return {
    materialType: r.material_type,
    visualCondition: r.visual_condition,
    visibleDefects: r.visible_defects ?? [],
    recoveryRecommendations: r.recovery_recommendations ?? [],
    reuseRecommendations: r.reuse_recommendations ?? [],
    verificationStatus: r.verification_status,
    createdAt: r.created_at,
  };
}

function mapListing(r: Row): ListingWithSeller {
  const seller = one(r.seller) as Row | undefined;
  return {
    id: r.id,
    sellerId: r.seller_id,
    title: r.title,
    description: r.description ?? "",
    category: r.category,
    price: Number(r.price),
    quantity: Number(r.quantity),
    unit: r.unit,
    condition: r.condition,
    city: r.city,
    status: r.status,
    images: [...(r.listing_images ?? [])].sort((a: Row, b: Row) => a.position - b.position).map((i: Row) => i.image_url),
    passport: mapPassport(one(r.material_passports)),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    seller: seller
      ? { id: seller.id, fullName: seller.full_name, phone: seller.phone ?? "", city: seller.city ?? "" }
      : { id: r.seller_id, fullName: "Пользователь", phone: "", city: r.city },
  };
}

async function uid(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Нужно войти в аккаунт");
  return id;
}

/* ---------- Авторизация ---------- */

export async function getCurrentUser(): Promise<Profile | null> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) return null;
  const { data: p, error } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
  fail(error);
  return p ? mapProfile(p) : null;
}

export async function register(d: { email: string; password: string; fullName: string; city: string; phone: string }) {
  const { data, error } = await db().auth.signUp({
    email: d.email.trim(),
    password: d.password,
    options: { data: { full_name: d.fullName.trim(), city: d.city, phone: d.phone.trim() } },
  });
  fail(error);
  if (!data.session) throw new Error("Аккаунт создан, но нужно подтвердить email. Для демо отключите подтверждение в Supabase → Authentication → Sign In / Providers → Email");
  const p = await getCurrentUser();
  if (!p) throw new Error("Профиль не создался. Проверьте, что schema.sql выполнен полностью");
  return p;
}

export async function login(email: string, password: string) {
  const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  fail(error);
  return (await getCurrentUser())!;
}

export async function logout() {
  await db().auth.signOut();
}

export async function updateProfile(patch: Partial<Pick<Profile, "fullName" | "city" | "phone">>) {
  const id = await uid();
  const { data, error } = await db()
    .from("profiles")
    .update({ full_name: patch.fullName, city: patch.city, phone: patch.phone })
    .eq("id", id)
    .select()
    .single();
  fail(error);
  return mapProfile(data);
}

/* ---------- Фото ---------- */

/** Загружает новые фото (data URL) в Storage, уже загруженные URL оставляет как есть. */
async function uploadImages(images: string[], userId: string): Promise<string[]> {
  return Promise.all(
    images.map(async (src) => {
      if (!src.startsWith("data:")) return src;
      const blob = await (await fetch(src)).blob();
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await db().storage.from("images").upload(path, blob, { contentType: "image/jpeg" });
      fail(error);
      return db().storage.from("images").getPublicUrl(path).data.publicUrl;
    }),
  );
}

async function replaceImages(listingId: string, urls: string[]) {
  const { error: delErr } = await db().from("listing_images").delete().eq("listing_id", listingId);
  fail(delErr);
  if (!urls.length) return;
  const { error } = await db().from("listing_images").insert(urls.map((image_url, position) => ({ listing_id: listingId, image_url, position })));
  fail(error);
}

async function savePassport(listingId: string, p: Passport) {
  const { error } = await db().from("material_passports").upsert(
    {
      listing_id: listingId,
      material_type: p.materialType,
      visual_condition: p.visualCondition,
      visible_defects: p.visibleDefects,
      recovery_recommendations: p.recoveryRecommendations,
      reuse_recommendations: p.reuseRecommendations,
      verification_status: p.verificationStatus,
    },
    { onConflict: "listing_id" },
  );
  fail(error);
}

const listingColumns = (i: Partial<ListingInput>) => {
  const row: Row = {
    title: i.title,
    description: i.description,
    category: i.category,
    price: i.price,
    quantity: i.quantity,
    unit: i.unit,
    condition: i.condition,
    city: i.city,
    status: i.status,
  };
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k]);
  return row;
};

/* ---------- Объявления ---------- */

/** Убираем символы, которые ломают синтаксис фильтра PostgREST. */
const safeWord = (w: string) => w.replace(/[%,()*\\:."']/g, "");

export async function listListings(f: ListingFilters = {}): Promise<ListingWithSeller[]> {
  let query = db().from("listings").select(LISTING_SELECT).eq("status", "active");
  for (const w of (f.q ?? "").split(/\s+/).map(safeWord).filter(Boolean)) {
    query = query.or(`title.ilike.%${w}%,description.ilike.%${w}%`);
  }
  if (f.category) query = query.eq("category", f.category);
  if (f.city) query = query.eq("city", f.city);
  if (f.condition) query = query.eq("condition", f.condition);
  if (f.minPrice != null) query = query.gte("price", f.minPrice);
  if (f.maxPrice != null) query = query.lte("price", f.maxPrice);
  const sort = f.sort ?? "new";
  query = sort === "new" ? query.order("created_at", { ascending: false }) : query.order("price", { ascending: sort === "price_asc" });
  const { data, error } = await query;
  fail(error);
  return (data ?? []).map(mapListing);
}

export async function getListing(id: string): Promise<ListingWithSeller | null> {
  const { data, error } = await db().from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (error && /invalid input syntax for type uuid/i.test(error.message)) return null;
  fail(error);
  return data ? mapListing(data) : null;
}

export async function myListings(): Promise<Listing[]> {
  const id = await uid();
  const { data, error } = await db().from("listings").select(LISTING_SELECT).eq("seller_id", id).order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map(mapListing);
}

export async function createListing(input: ListingInput): Promise<Listing> {
  const userId = await uid();
  const urls = await uploadImages(input.images, userId);
  const { data, error } = await db()
    .from("listings")
    .insert({ ...listingColumns(input), status: input.status ?? "active", seller_id: userId })
    .select("id")
    .single();
  fail(error);
  await replaceImages(data.id, urls);
  if (input.passport) await savePassport(data.id, input.passport);
  return (await getListing(data.id))!;
}

export async function updateListing(id: string, patch: Partial<ListingInput>): Promise<Listing> {
  const userId = await uid();
  const { error } = await db().from("listings").update(listingColumns(patch)).eq("id", id).eq("seller_id", userId);
  fail(error);
  if (patch.images) await replaceImages(id, await uploadImages(patch.images, userId));
  if (patch.passport) await savePassport(id, patch.passport);
  return (await getListing(id))!;
}

export async function deleteListing(id: string) {
  const userId = await uid();
  const { error } = await db().from("listings").delete().eq("id", id).eq("seller_id", userId);
  fail(error);
}

export async function categoryCounts(): Promise<Record<string, number>> {
  const { data, error } = await db().from("listings").select("category").eq("status", "active");
  fail(error);
  const c: Record<string, number> = {};
  for (const r of data ?? []) c[r.category] = (c[r.category] ?? 0) + 1;
  return c;
}

/* ---------- Избранное ---------- */

export async function favoriteIds(): Promise<string[]> {
  const { data: s } = await db().auth.getSession();
  if (!s.session) return [];
  const { data, error } = await db().from("favorites").select("listing_id");
  fail(error);
  return (data ?? []).map((r) => r.listing_id);
}

export async function toggleFavorite(listingId: string): Promise<boolean> {
  const userId = await uid();
  const { data: existing, error } = await db().from("favorites").select("id").eq("listing_id", listingId).maybeSingle();
  fail(error);
  if (existing) {
    const { error: e } = await db().from("favorites").delete().eq("id", existing.id);
    fail(e);
    return false;
  }
  const { error: e } = await db().from("favorites").insert({ user_id: userId, listing_id: listingId });
  fail(e);
  return true;
}

export async function favoriteListings(): Promise<ListingWithSeller[]> {
  const ids = await favoriteIds();
  if (!ids.length) return [];
  const { data, error } = await db().from("listings").select(LISTING_SELECT).in("id", ids);
  fail(error);
  return (data ?? []).map(mapListing);
}

/** В режиме Supabase данные общие для всех — сбрасывать нечего. */
export function resetDemoData() {}
