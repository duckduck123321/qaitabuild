-- QaitaBuild: права доступа к таблицам для сайта.
-- В новых проектах Supabase их нужно выдать явно. Что именно можно делать с
-- конкретными строками, всё равно решают правила RLS из schema.sql.
grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.listings, public.listing_images, public.material_passports to anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.listings, public.listing_images, public.material_passports,
  public.favorites, public.ai_analyses, public.project_requests
to authenticated;
