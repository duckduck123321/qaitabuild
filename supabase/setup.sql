-- QaitaBuild: схема + тестовые данные одним файлом. Supabase → SQL Editor → вставить → Run.

-- =====================================================================
-- QaitaBuild — схема базы данных для Supabase
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Запускать один раз на новом проекте. После него запустите seed.sql.
-- =====================================================================

-- ---------- Таблицы ----------

-- Профиль пользователя. Для зарегистрированных создаётся автоматически триггером.
-- Не ссылается на auth.users, чтобы в демо можно было завести тестовых продавцов.
create table public.profiles (
  id          uuid primary key,
  full_name   text not null default '',
  email       text,
  city        text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  description  text not null default '',
  category     text not null,
  price        numeric(12,2) not null default 0 check (price >= 0),
  quantity     numeric not null check (quantity > 0),
  unit         text not null,
  condition    text not null,
  city         text not null,
  status       text not null default 'active' check (status in ('active', 'sold')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_seller_idx on public.listings (seller_id);

create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  image_url   text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id);

-- Цифровой паспорт материала (AI-5). Один паспорт на объявление.
create table public.material_passports (
  id                        uuid primary key default gen_random_uuid(),
  listing_id                uuid not null unique references public.listings(id) on delete cascade,
  material_type             text not null default '',
  visual_condition          text not null default '',
  visible_defects           jsonb not null default '[]',
  recovery_recommendations  jsonb not null default '[]',
  reuse_recommendations     jsonb not null default '[]',
  ai_analysis               jsonb,
  verification_status       text not null default 'ai_suggested'
                            check (verification_status in ('ai_suggested', 'user_confirmed')),
  created_at                timestamptz not null default now()
);

create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- История AI-анализов (заполняется на этапе AI).
create table public.ai_analyses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  analysis_type  text not null
                 check (analysis_type in ('inspector', 'recovery', 'passport', 'reuse_planner', 'pre_demolition')),
  input_data     jsonb,
  result         jsonb,
  created_at     timestamptz not null default now()
);

-- Запросы в Project Reuse Planner (заполняется на этапе AI).
create table public.project_requests (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  project_description  text not null,
  extracted_materials  jsonb,
  recommendations      jsonb,
  created_at           timestamptz not null default now()
);

-- ---------- Триггеры ----------

-- updated_at у объявлений обновляется автоматически
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger listings_touch before update on public.listings
for each row execute function public.touch_updated_at();

-- При регистрации создаём профиль из данных формы (имя, город, телефон)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, city, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
-- Правило: читать каталог могут все, менять — только своё.

alter table public.profiles           enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_images     enable row level security;
alter table public.material_passports enable row level security;
alter table public.favorites          enable row level security;
alter table public.ai_analyses        enable row level security;
alter table public.project_requests   enable row level security;

-- profiles
create policy "profiles: читают все" on public.profiles
  for select using (true);
create policy "profiles: меняет владелец" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- listings
create policy "listings: активные видят все, свои — владелец" on public.listings
  for select using (status = 'active' or seller_id = auth.uid());
create policy "listings: создаёт владелец" on public.listings
  for insert with check (seller_id = auth.uid());
create policy "listings: меняет владелец" on public.listings
  for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "listings: удаляет владелец" on public.listings
  for delete using (seller_id = auth.uid());

-- listing_images и material_passports — права как у родительского объявления
create policy "listing_images: читают все" on public.listing_images
  for select using (true);
create policy "listing_images: управляет владелец объявления" on public.listing_images
  for all using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

create policy "material_passports: читают все" on public.material_passports
  for select using (true);
create policy "material_passports: управляет владелец объявления" on public.material_passports
  for all using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Личные данные — только свои
create policy "favorites: только свои" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_analyses: только свои" on public.ai_analyses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "project_requests: только свои" on public.project_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Storage: фото объявлений ----------
-- Публичный bucket `images`. Пользователь загружает файлы только в папку со своим id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "images: читают все" on storage.objects
  for select using (bucket_id = 'images');
create policy "images: загрузка в свою папку" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "images: удаление своих" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Права доступа ----------
-- В новых проектах Supabase их нужно выдать явно. Что именно можно делать с
-- конкретными строками, всё равно решают правила RLS из schema.sql.
grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.listings, public.listing_images, public.material_passports to anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.listings, public.listing_images, public.material_passports,
  public.favorites, public.ai_analyses, public.project_requests
to authenticated;

-- QaitaBuild — тестовые данные. Сгенерировано scripts/gen-seed.ts, не редактировать вручную.
-- Запускать после schema.sql. Повторный запуск безопасен (on conflict do nothing).

insert into public.profiles (id, full_name, email, city, phone, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'Айдар Сериков', 'aidar@demo.kz', 'Алматы', '+7 701 123 45 67', now() - interval '60 days'),
  ('00000000-0000-4000-8000-000000000002', 'Дана Ермекова', 'dana@demo.kz', 'Астана', '+7 702 234 56 78', now() - interval '45 days'),
  ('00000000-0000-4000-8000-000000000003', 'Бригада «ДомСтрой»', 'domstroy@demo.kz', 'Алматы', '+7 705 345 67 89', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000004', 'Марат Ахметов', 'marat@demo.kz', 'Шымкент', '+7 707 456 78 90', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000005', 'Ксения Ли', 'ksenia@demo.kz', 'Караганда', '+7 708 567 89 01', now() - interval '20 days')
on conflict (id) do nothing;

insert into public.listings (id, seller_id, title, description, category, price, quantity, unit, condition, city, status, created_at, updated_at) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000003', 'Кирпич керамический красный, б/у', 'Остался после разбора перегородки. Очищен от раствора примерно на 80%. Есть небольшие сколы на углах. Подойдёт для забора, клумб, хозпостроек.', 'bricks_blocks', 45, 1200, 'шт', 'good', 'Алматы', 'active', now() - interval '1 days', now() - interval '1 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'Газоблок D500 600×300×200', 'Остаток после строительства дома. Хранились под навесом на поддоне. Около 2,5 м³.', 'bricks_blocks', 18000, 2.5, 'м³', 'new', 'Алматы', 'active', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000004', 'Шлакоблок, 300 шт', 'Разобрали старый сарай. Блоки крепкие, местами отбитые края. Самовывоз.', 'bricks_blocks', 120, 300, 'шт', 'fair', 'Шымкент', 'active', now() - interval '9 days', now() - interval '9 days'),
  ('00000000-0000-4000-9000-000000000004', '00000000-0000-4000-8000-000000000005', 'Облицовочный кирпич бежевый', 'Купили с запасом, осталось 2 поддона. Новый, в плёнке.', 'bricks_blocks', 95, 640, 'шт', 'new', 'Караганда', 'active', now() - interval '12 days', now() - interval '12 days'),
  ('00000000-0000-4000-9000-000000000005', '00000000-0000-4000-8000-000000000001', 'Доска обрезная сосна 50×150×6000', 'Использовалась как опалубка один раз. Следы бетона, без гнили. Можно строгать.', 'wood_lumber', 2200, 40, 'шт', 'good', 'Алматы', 'active', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000006', '00000000-0000-4000-8000-000000000002', 'Старый дубовый паркет, ~18 м²', 'Сняли при ремонте квартиры в сталинке. Штучный, ёлочкой. Нужна циклёвка, некоторые планки с трещинами.', 'wood_lumber', 3500, 18, 'м²', 'needs_repair', 'Астана', 'active', now() - interval '5 days', now() - interval '5 days'),
  ('00000000-0000-4000-9000-000000000007', '00000000-0000-4000-8000-000000000003', 'Брус 100×100, обрезки 1–2 м', 'Обрезки после монтажа каркаса. Около 60 штук разной длины. Отдам недорого.', 'wood_lumber', 400, 60, 'шт', 'good', 'Алматы', 'active', now() - interval '7 days', now() - interval '7 days'),
  ('00000000-0000-4000-9000-000000000008', '00000000-0000-4000-8000-000000000005', 'Вагонка липа, класс А', 'Осталась после отделки бани. 3 упаковки по 10 шт, длина 2 м.', 'wood_lumber', 9000, 3, 'упак.', 'new', 'Караганда', 'active', now() - interval '15 days', now() - interval '15 days'),
  ('00000000-0000-4000-9000-000000000009', '00000000-0000-4000-8000-000000000004', 'Профильная труба 40×20, б/у', 'Демонтировали навес. Около 60 погонных метров, есть поверхностная ржавчина.', 'metal', 550, 60, 'пог. м', 'fair', 'Шымкент', 'active', now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-4000-9000-000000000010', '00000000-0000-4000-8000-000000000003', 'Арматура А500 12 мм, остатки', 'Обрезки длиной 1,5–4 м после заливки фундамента. Примерно 300 кг.', 'metal', 180, 300, 'кг', 'good', 'Алматы', 'active', now() - interval '6 days', now() - interval '6 days'),
  ('00000000-0000-4000-9000-000000000011', '00000000-0000-4000-8000-000000000001', 'Металлическая лестница-стремянка', 'Самодельная, сварная, высота 2 м. Крепкая, нужна покраска.', 'metal', 15000, 1, 'шт', 'fair', 'Алматы', 'active', now() - interval '20 days', now() - interval '20 days'),
  ('00000000-0000-4000-9000-000000000012', '00000000-0000-4000-8000-000000000002', 'Керамогранит 60×60 серый матовый', 'Остаток после ремонта ванной: 2 полные коробки + россыпь. Всего около 4,3 м².', 'tiles', 4500, 4.3, 'м²', 'new', 'Астана', 'active', now() - interval '1 days', now() - interval '1 days'),
  ('00000000-0000-4000-9000-000000000013', '00000000-0000-4000-8000-000000000001', 'Плитка настенная белая 20×30', 'Аккуратно сняли со стены кухни. Около 6 м², на тыльной стороне остатки клея.', 'tiles', 1500, 6, 'м²', 'good', 'Алматы', 'active', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-9000-000000000014', '00000000-0000-4000-8000-000000000005', 'Мозаика стеклянная голубая', '8 листов 30×30, новые. Не подошли по цвету.', 'tiles', 1200, 8, 'шт', 'new', 'Караганда', 'active', now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-4000-9000-000000000015', '00000000-0000-4000-8000-000000000004', 'Тротуарная плитка, б/у ~25 м²', 'Демонтировали двор. Плитка «кирпичик», серая. Часть со сколами.', 'tiles', 1800, 25, 'м²', 'fair', 'Шымкент', 'active', now() - interval '14 days', now() - interval '14 days'),
  ('00000000-0000-4000-9000-000000000016', '00000000-0000-4000-8000-000000000002', 'Межкомнатная дверь массив, 80 см', 'Сняли при перепланировке. С коробкой и наличниками. Есть потёртости лака.', 'doors_windows', 25000, 1, 'шт', 'good', 'Астана', 'active', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000017', '00000000-0000-4000-8000-000000000001', 'Пластиковое окно 1300×1400', 'Двухстворчатое, с подоконником. Демонтировали при остеклении лоджии. Стеклопакет целый.', 'doors_windows', 30000, 1, 'шт', 'good', 'Алматы', 'active', now() - interval '8 days', now() - interval '8 days'),
  ('00000000-0000-4000-9000-000000000018', '00000000-0000-4000-8000-000000000003', 'Деревянные рамы старые, 4 шт', 'Старые советские рамы со стёклами. Подойдут для теплицы или декора.', 'doors_windows', 0, 4, 'шт', 'needs_repair', 'Алматы', 'active', now() - interval '11 days', now() - interval '11 days'),
  ('00000000-0000-4000-9000-000000000019', '00000000-0000-4000-8000-000000000002', 'Раковина керамическая с пьедесталом', 'Белая, без сколов. Демонтировали при замене на тумбу. Смеситель не входит.', 'plumbing', 8000, 1, 'шт', 'excellent', 'Астана', 'active', now() - interval '1 days', now() - interval '1 days'),
  ('00000000-0000-4000-9000-000000000020', '00000000-0000-4000-8000-000000000005', 'Ванна чугунная 170 см', 'Старая, тяжёлая, эмаль местами потёрта. Можно отреставрировать вкладышем или наливом.', 'plumbing', 10000, 1, 'шт', 'needs_repair', 'Караганда', 'active', now() - interval '6 days', now() - interval '6 days'),
  ('00000000-0000-4000-9000-000000000021', '00000000-0000-4000-8000-000000000004', 'Полипропиленовые трубы 20 мм', 'Остаток после разводки: около 30 м плюс пакет фитингов.', 'plumbing', 150, 30, 'м', 'new', 'Шымкент', 'active', now() - interval '13 days', now() - interval '13 days'),
  ('00000000-0000-4000-9000-000000000022', '00000000-0000-4000-8000-000000000001', 'Смеситель для кухни, хром', 'Рабочий, снят из-за смены дизайна. Картридж поменян полгода назад.', 'plumbing', 6000, 1, 'шт', 'good', 'Алматы', 'active', now() - interval '4 days', now() - interval '4 days'),
  ('00000000-0000-4000-9000-000000000023', '00000000-0000-4000-8000-000000000003', 'Кабель ВВГнг 3×2,5, остатки', 'Бухта неполная, около 45 м. Новый.', 'electrical', 380, 45, 'м', 'new', 'Алматы', 'active', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000024', '00000000-0000-4000-8000-000000000002', 'Розетки и выключатели Legrand, 12 шт', 'Белые, сняты при замене на чёрные. Все рабочие.', 'electrical', 700, 12, 'шт', 'good', 'Астана', 'active', now() - interval '9 days', now() - interval '9 days'),
  ('00000000-0000-4000-9000-000000000025', '00000000-0000-4000-8000-000000000004', 'Профнастил С8, б/у, 20 листов', 'Снят со старого навеса, 2 м × 1,2 м. Есть отверстия от саморезов.', 'roofing', 2500, 20, 'шт', 'fair', 'Шымкент', 'active', now() - interval '5 days', now() - interval '5 days'),
  ('00000000-0000-4000-9000-000000000026', '00000000-0000-4000-8000-000000000005', 'Мягкая черепица, 3 упаковки', 'Осталась после кровли беседки. Цвет коричневый.', 'roofing', 7000, 3, 'упак.', 'new', 'Караганда', 'active', now() - interval '16 days', now() - interval '16 days'),
  ('00000000-0000-4000-9000-000000000027', '00000000-0000-4000-8000-000000000001', 'Ламинат 32 класс, дуб, 7 м²', 'Остаток после ремонта, 3 пачки, одна вскрыта.', 'finishing', 2800, 7, 'м²', 'new', 'Алматы', 'active', now() - interval '1 days', now() - interval '1 days'),
  ('00000000-0000-4000-9000-000000000028', '00000000-0000-4000-8000-000000000002', 'Гипсокартон влагостойкий, 6 листов', 'Обрезки и целые листы. Подходит для ванной.', 'finishing', 1500, 6, 'шт', 'good', 'Астана', 'active', now() - interval '7 days', now() - interval '7 days'),
  ('00000000-0000-4000-9000-000000000029', '00000000-0000-4000-8000-000000000003', 'Декоративная штукатурка, 2 ведра', 'Остаток, срок годности до следующего года. Белая, под колеровку.', 'finishing', 8000, 2, 'шт', 'new', 'Алматы', 'active', now() - interval '12 days', now() - interval '12 days'),
  ('00000000-0000-4000-9000-000000000030', '00000000-0000-4000-8000-000000000004', 'Поддоны деревянные, 15 шт', 'Европоддоны после доставки блоков. Годятся для мебели в стиле лофт или на дрова.', 'other', 1000, 15, 'шт', 'good', 'Шымкент', 'active', now() - interval '3 days', now() - interval '3 days'),
  ('00000000-0000-4000-9000-000000000031', '00000000-0000-4000-8000-000000000005', 'Утеплитель минвата, 2 упаковки', 'Остаток после утепления мансарды, 50 мм.', 'other', 6000, 2, 'упак.', 'new', 'Караганда', 'active', now() - interval '8 days', now() - interval '8 days')
on conflict (id) do nothing;

insert into public.material_passports (listing_id, material_type, visual_condition, visible_defects, recovery_recommendations, reuse_recommendations, verification_status) values
  ('00000000-0000-4000-9000-000000000001', 'Керамический полнотелый кирпич', 'Следы раствора, небольшие сколы на углах', '["Сколы на углах","Остатки цементного раствора"]'::jsonb, '["Очистить остатки раствора скребком","Отбраковать кирпичи с трещинами"]'::jsonb, '["Садовые дорожки и бордюры","Ненесущие перегородки в хозпостройках","Мангальная зона (не топка)"]'::jsonb, 'user_confirmed'),
  ('00000000-0000-4000-9000-000000000005', 'Сосновая обрезная доска', 'Следы бетона на поверхности, древесина сухая', '["Следы бетона","Отверстия от гвоздей"]'::jsonb, '["Удалить гвозди","Острогать или отшлифовать поверхность","Проверить на гниль и жучка"]'::jsonb, '["Стеллажи и мебель для гаража","Грядки и садовые короба","Повторная опалубка"]'::jsonb, 'ai_suggested'),
  ('00000000-0000-4000-9000-000000000013', 'Керамическая настенная плитка (глазурованная)', 'Глазурь целая, на тыльной стороне остатки клея', '["Остатки плиточного клея","Единичные сколы по краю"]'::jsonb, '["Замочить и счистить старый клей","Отбраковать плитки со сколами"]'::jsonb, '["Фартук в санузле или на кухне","Облицовка подсобных помещений","Мозаика из обломков"]'::jsonb, 'user_confirmed'),
  ('00000000-0000-4000-9000-000000000019', 'Санфаянсовая раковина с пьедесталом', 'Глазурь целая, сколов и трещин не видно', '["Известковый налёт у сливного отверстия"]'::jsonb, '["Удалить налёт средством с кислотой","Заменить сифон и прокладки"]'::jsonb, '["Санузел в квартире или на даче","Гостевой туалет"]'::jsonb, 'user_confirmed')
on conflict (listing_id) do nothing;

-- Фото тестовых объявлений (перезаписываются при каждом запуске)
delete from public.listing_images where listing_id::text like '00000000-0000-4000-9000-%';
insert into public.listing_images (listing_id, image_url, position) values
  ('00000000-0000-4000-9000-000000000001', 'https://images.unsplash.com/photo-1629608564457-5d74829a9e14?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000002', 'https://images.unsplash.com/photo-1641375863453-238c8b00b867?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000003', 'https://images.unsplash.com/photo-1650460533962-601b36580ef4?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000004', 'https://images.unsplash.com/photo-1559322575-2f4e66131d55?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000005', 'https://images.unsplash.com/photo-1422246654994-34520d5a0340?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000006', 'https://images.unsplash.com/photo-1761053130711-2515ef532bb5?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000007', 'https://images.unsplash.com/photo-1634672652995-ee7525bce595?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000008', 'https://images.unsplash.com/photo-1597113366853-fea190b6cd82?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000009', 'https://images.unsplash.com/photo-1721622045835-51a5447f281c?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000010', 'https://images.unsplash.com/photo-1745909247906-123b53b70e06?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000011', 'https://images.unsplash.com/photo-1549030782-4935f80baeb6?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000012', 'https://images.unsplash.com/photo-1534503442463-e0ddba45cf4c?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000013', 'https://images.unsplash.com/photo-1781445781804-dff17e05bd53?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000014', 'https://images.unsplash.com/photo-1644056368311-c8054df845d0?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000015', 'https://images.unsplash.com/photo-1603621713988-693d692937fd?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000016', 'https://images.unsplash.com/photo-1490717164730-d639c415a82a?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000017', 'https://images.unsplash.com/photo-1695928668952-c3c01a638e1d?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000018', 'https://images.unsplash.com/photo-1587729042088-a8034bffd61a?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000019', 'https://images.unsplash.com/photo-1771681744660-d3ff70bc24a2?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000020', 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000021', 'https://images.unsplash.com/photo-1545193329-4a052e14eb8f?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000022', 'https://images.unsplash.com/photo-1629078692818-c5a0443f4ae3?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000023', 'https://images.unsplash.com/photo-1518181835702-6eef8b4b2113?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000024', 'https://images.unsplash.com/photo-1484024091473-858a1e7ece52?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000025', 'https://images.unsplash.com/photo-1770085057307-c9a38bb834e0?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000026', 'https://images.unsplash.com/photo-1710139323182-69622cad5c3b?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000027', 'https://images.unsplash.com/photo-1575204015311-0fe377370780?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000028', 'https://images.unsplash.com/photo-1770838773417-08b18661c62f?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000029', 'https://images.unsplash.com/photo-1623835255306-868c63d9335e?w=1000&q=75&auto=format&fit=crop', 0),
  ('00000000-0000-4000-9000-000000000030', 'https://images.unsplash.com/photo-1573209680076-bd7ec7007616?w=1000&q=75&auto=format&fit=crop', 0);
