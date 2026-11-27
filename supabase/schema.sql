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
