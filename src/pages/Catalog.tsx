import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, PackageSearch, X } from "lucide-react";
import * as api from "@/lib/api";
import { CATEGORIES, CITIES, CONDITIONS } from "@/lib/constants";
import type { ListingFilters, ListingWithSeller } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button, EmptyState, Input, Label, Select, Spinner, cn } from "@/components/ui";
import { ListingGrid } from "@/components/listing";

export default function Catalog() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState<ListingWithSeller[] | null>(null);
  const [fav, setFav] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");

  const filters: ListingFilters = {
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    city: sp.get("city") ?? undefined,
    condition: sp.get("condition") ?? undefined,
    minPrice: sp.get("min") ? Number(sp.get("min")) : undefined,
    maxPrice: sp.get("max") ? Number(sp.get("max")) : undefined,
    sort: (sp.get("sort") as ListingFilters["sort"]) ?? "new",
  };

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    setSp(next, { replace: true });
  };

  useEffect(() => {
    setItems(null);
    api.listListings(filters).then(setItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  useEffect(() => {
    api.favoriteIds().then(setFav);
  }, [user]);

  const activeCount = ["category", "city", "condition", "min", "max"].filter((k) => sp.get(k)).length;

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold tracking-tight">Каталог материалов</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          set("q", q.trim());
        }}
        className="mt-5 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию и описанию" className="pl-10" />
        </div>
        <Button type="submit">Найти</Button>
        <Button type="button" variant="outline" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] text-white">{activeCount}</span>}
        </Button>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={cn("space-y-4 self-start rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24 lg:block", !showFilters && "hidden")}>
          <label className="block">
            <Label>Категория</Label>
            <Select value={filters.category ?? ""} onChange={(e) => set("category", e.target.value)}>
              <option value="">Все категории</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <label className="block">
            <Label>Город</Label>
            <Select value={filters.city ?? ""} onChange={(e) => set("city", e.target.value)}>
              <option value="">Все города</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </label>
          <label className="block">
            <Label>Состояние</Label>
            <Select value={filters.condition ?? ""} onChange={(e) => set("condition", e.target.value)}>
              <option value="">Любое</option>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <div>
            <Label>Цена, ₸</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} placeholder="от" defaultValue={sp.get("min") ?? ""} onBlur={(e) => set("min", e.target.value)} />
              <Input type="number" min={0} placeholder="до" defaultValue={sp.get("max") ?? ""} onBlur={(e) => set("max", e.target.value)} />
            </div>
          </div>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setSp(sp.get("q") ? { q: sp.get("q")! } : {}, { replace: true })}>
              <X className="h-4 w-4" /> Сбросить фильтры
            </Button>
          )}
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">{items ? `Найдено: ${items.length}` : "Загрузка…"}</p>
            <Select value={filters.sort} onChange={(e) => set("sort", e.target.value)} className="h-9 w-auto text-sm">
              <option value="new">Сначала новые</option>
              <option value="price_asc">Сначала дешевле</option>
              <option value="price_desc">Сначала дороже</option>
            </Select>
          </div>
          {!items ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title="Ничего не нашлось" text="Попробуйте изменить запрос или убрать часть фильтров." />
          ) : (
            <ListingGrid items={items} favIds={fav} />
          )}
        </div>
      </div>
    </div>
  );
}
