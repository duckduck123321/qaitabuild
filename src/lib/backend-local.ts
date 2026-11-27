/**
 * Демо-бэкенд: данные в localStorage браузера, при первом запуске заполняются
 * тестовыми объявлениями из src/data/seed.ts. Используется, когда Supabase
 * не настроен (нет .env.local).
 */
import { SEED_LISTINGS, SEED_PROFILES } from "@/data/seed";
import type { Listing, ListingFilters, ListingInput, ListingWithSeller, Profile } from "./types";

const KEY = "qaitabuild-demo-v1";

interface DB {
  profiles: Profile[];
  /** Только для демо-режима. В Supabase пароли хранит Supabase Auth. */
  credentials: Record<string, string>;
  listings: Listing[];
  favorites: { userId: string; listingId: string }[];
  session: string | null;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* повреждённые данные — пересоздаём */
  }
  const fresh: DB = { profiles: SEED_PROFILES, credentials: {}, listings: SEED_LISTINGS, favorites: [], session: null };
  save(fresh);
  return fresh;
}

function save(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("Не хватает места в браузере для сохранения. Попробуйте фото меньшего размера.");
  }
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function withSeller(db: DB, l: Listing): ListingWithSeller {
  const p = db.profiles.find((x) => x.id === l.sellerId);
  return {
    ...l,
    seller: p ? { id: p.id, fullName: p.fullName, phone: p.phone, city: p.city } : { id: l.sellerId, fullName: "Пользователь", phone: "", city: l.city },
  };
}

function requireUser(db: DB): Profile {
  const u = db.profiles.find((p) => p.id === db.session);
  if (!u) throw new Error("Нужно войти в аккаунт");
  return u;
}

/* ---------- Авторизация ---------- */

export async function getCurrentUser(): Promise<Profile | null> {
  const db = load();
  return delay(db.profiles.find((p) => p.id === db.session) ?? null);
}

export async function register(data: { email: string; password: string; fullName: string; city: string; phone: string }) {
  const db = load();
  const email = data.email.trim().toLowerCase();
  if (db.profiles.some((p) => p.email === email)) throw new Error("Пользователь с таким email уже зарегистрирован");
  const profile: Profile = { id: uid(), email, fullName: data.fullName.trim(), city: data.city, phone: data.phone.trim(), createdAt: new Date().toISOString() };
  db.profiles.push(profile);
  db.credentials[email] = data.password;
  db.session = profile.id;
  save(db);
  return delay(profile);
}

export async function login(email: string, password: string) {
  const db = load();
  const e = email.trim().toLowerCase();
  const p = db.profiles.find((x) => x.email === e);
  if (!p || db.credentials[e] !== password) throw new Error("Неверный email или пароль");
  db.session = p.id;
  save(db);
  return delay(p);
}

export async function logout(): Promise<void> {
  const db = load();
  db.session = null;
  save(db);
  return delay(undefined);
}

export async function updateProfile(patch: Partial<Pick<Profile, "fullName" | "city" | "phone">>) {
  const db = load();
  const u = requireUser(db);
  Object.assign(u, patch);
  save(db);
  return delay({ ...u });
}

/* ---------- Объявления ---------- */

export async function listListings(f: ListingFilters = {}): Promise<ListingWithSeller[]> {
  const db = load();
  let res = db.listings.filter((l) => l.status === "active");
  if (f.q) {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    res = res.filter((l) => {
      const text = `${l.title} ${l.description}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }
  if (f.category) res = res.filter((l) => l.category === f.category);
  if (f.city) res = res.filter((l) => l.city === f.city);
  if (f.condition) res = res.filter((l) => l.condition === f.condition);
  if (f.minPrice != null) res = res.filter((l) => l.price >= f.minPrice!);
  if (f.maxPrice != null) res = res.filter((l) => l.price <= f.maxPrice!);
  const sort = f.sort ?? "new";
  res = [...res].sort((a, b) =>
    sort === "price_asc" ? a.price - b.price : sort === "price_desc" ? b.price - a.price : b.createdAt.localeCompare(a.createdAt),
  );
  return delay(res.map((l) => withSeller(db, l)));
}

export async function getListing(id: string): Promise<ListingWithSeller | null> {
  const db = load();
  const l = db.listings.find((x) => x.id === id);
  return delay(l ? withSeller(db, l) : null);
}

export async function myListings(): Promise<Listing[]> {
  const db = load();
  const u = requireUser(db);
  return delay(db.listings.filter((l) => l.sellerId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function createListing(input: ListingInput): Promise<Listing> {
  const db = load();
  const u = requireUser(db);
  const now = new Date().toISOString();
  const l: Listing = { ...input, status: input.status ?? "active", id: uid(), sellerId: u.id, createdAt: now, updatedAt: now };
  db.listings.push(l);
  save(db);
  return delay(l);
}

export async function updateListing(id: string, patch: Partial<ListingInput>): Promise<Listing> {
  const db = load();
  const u = requireUser(db);
  const l = db.listings.find((x) => x.id === id);
  if (!l) throw new Error("Объявление не найдено");
  if (l.sellerId !== u.id) throw new Error("Можно редактировать только свои объявления");
  Object.assign(l, patch, { updatedAt: new Date().toISOString() });
  save(db);
  return delay({ ...l });
}

export async function deleteListing(id: string): Promise<void> {
  const db = load();
  const u = requireUser(db);
  const l = db.listings.find((x) => x.id === id);
  if (!l || l.sellerId !== u.id) throw new Error("Можно удалять только свои объявления");
  db.listings = db.listings.filter((x) => x.id !== id);
  db.favorites = db.favorites.filter((f) => f.listingId !== id);
  save(db);
  return delay(undefined);
}

export async function categoryCounts(): Promise<Record<string, number>> {
  const db = load();
  const c: Record<string, number> = {};
  for (const l of db.listings) if (l.status === "active") c[l.category] = (c[l.category] ?? 0) + 1;
  return delay(c);
}

/* ---------- Избранное ---------- */

export async function favoriteIds(): Promise<string[]> {
  const db = load();
  if (!db.session) return delay([]);
  return delay(db.favorites.filter((f) => f.userId === db.session).map((f) => f.listingId));
}

export async function toggleFavorite(listingId: string): Promise<boolean> {
  const db = load();
  const u = requireUser(db);
  const i = db.favorites.findIndex((f) => f.userId === u.id && f.listingId === listingId);
  if (i >= 0) db.favorites.splice(i, 1);
  else db.favorites.push({ userId: u.id, listingId });
  save(db);
  return delay(i < 0);
}

export async function favoriteListings(): Promise<ListingWithSeller[]> {
  const db = load();
  const u = requireUser(db);
  const ids = new Set(db.favorites.filter((f) => f.userId === u.id).map((f) => f.listingId));
  return delay(db.listings.filter((l) => ids.has(l.id)).map((l) => withSeller(db, l)));
}

/** Сбросить демо-данные к исходным (кнопка в футере). */
export function resetDemoData() {
  localStorage.removeItem(KEY);
}
