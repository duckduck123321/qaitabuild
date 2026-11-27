/**
 * Генерирует supabase/seed.sql из src/data/seed.ts.
 * Запуск: node scripts/gen-seed.ts   (Node 22.6+ понимает TypeScript сам)
 */
import { writeFileSync } from "node:fs";
import { SEED_LISTINGS, SEED_PROFILES } from "../src/data/seed.ts";

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const daysAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86400000));
const pad = (n: number) => String(n).padStart(12, "0");

const profileId = new Map(SEED_PROFILES.map((p, i) => [p.id, `00000000-0000-4000-8000-${pad(i + 1)}`]));
const listingId = (i: number) => `00000000-0000-4000-9000-${pad(i + 1)}`;

const out: string[] = [
  "-- QaitaBuild — тестовые данные. Сгенерировано scripts/gen-seed.ts, не редактировать вручную.",
  "-- Запускать после schema.sql. Повторный запуск безопасен (on conflict do nothing).",
  "",
  "insert into public.profiles (id, full_name, email, city, phone, created_at) values",
  SEED_PROFILES.map((p) => `  (${q(profileId.get(p.id)!)}, ${q(p.fullName)}, ${q(p.email)}, ${q(p.city)}, ${q(p.phone)}, now() - interval '${daysAgo(p.createdAt)} days')`).join(",\n") +
    "\non conflict (id) do nothing;",
  "",
  "insert into public.listings (id, seller_id, title, description, category, price, quantity, unit, condition, city, status, created_at, updated_at) values",
  SEED_LISTINGS.map((l, i) => {
    const t = `now() - interval '${daysAgo(l.createdAt)} days'`;
    return `  (${q(listingId(i))}, ${q(profileId.get(l.sellerId)!)}, ${q(l.title)}, ${q(l.description)}, ${q(l.category)}, ${l.price}, ${l.quantity}, ${q(l.unit)}, ${q(l.condition)}, ${q(l.city)}, 'active', ${t}, ${t})`;
  }).join(",\n") + "\non conflict (id) do nothing;",
  "",
];

const passports = SEED_LISTINGS.map((l, i) => [l, i] as const).filter(([l]) => l.passport);
if (passports.length) {
  out.push(
    "insert into public.material_passports (listing_id, material_type, visual_condition, visible_defects, recovery_recommendations, reuse_recommendations, verification_status) values",
    passports.map(([l, i]) => {
      const p = l.passport!;
      return `  (${q(listingId(i))}, ${q(p.materialType)}, ${q(p.visualCondition)}, ${j(p.visibleDefects)}, ${j(p.recoveryRecommendations)}, ${j(p.reuseRecommendations)}, ${q(p.verificationStatus)})`;
    }).join(",\n") + "\non conflict (listing_id) do nothing;",
    "",
  );
}

const withImages = SEED_LISTINGS.map((l, i) => [l, i] as const).filter(([l]) => l.images.length);
const imagesSql = [
  "-- Фото тестовых объявлений (перезаписываются при каждом запуске)",
  "delete from public.listing_images where listing_id::text like '00000000-0000-4000-9000-%';",
  "insert into public.listing_images (listing_id, image_url, position) values",
  withImages.flatMap(([l, i]) => l.images.map((url, pos) => `  (${q(listingId(i))}, ${q(url)}, ${pos})`)).join(",\n") + ";",
  "",
];
out.push(...imagesSql);

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n"));
writeFileSync(new URL("../supabase/photos.sql", import.meta.url), ["-- QaitaBuild: добавить фото к тестовым объявлениям.", ...imagesSql].join("\n"));
console.log(`seed.sql: ${SEED_PROFILES.length} профилей, ${SEED_LISTINGS.length} объявлений, ${passports.length} паспортов, ${withImages.length} с фото`);
