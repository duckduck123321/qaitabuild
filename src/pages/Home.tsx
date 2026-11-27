import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, ArrowRight, Camera, ClipboardList, Recycle, ScanSearch, FileBadge, Hammer, Upload, Handshake, Leaf } from "lucide-react";
import * as api from "@/lib/api";
import { CATEGORIES } from "@/lib/constants";
import type { ListingWithSeller } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";
import { CATEGORY_ICONS, ListingGrid } from "@/components/listing";

export const AI_TOOLS = [
  { to: "/ai/project-planner", icon: ClipboardList, title: "Подбор под проект", text: "Опишите ремонт словами — ИИ подскажет, что можно взять б/у, и найдёт реальные объявления.", main: true },
  { to: "/ai/inspector", icon: Camera, title: "Анализ материала по фото", text: "Тип материала, видимые дефекты и предварительная оценка состояния." },
  { to: "/ai/recovery", icon: Recycle, title: "План восстановления", text: "Как очистить и восстановить материал и где его применить." },
  { to: "/ai/pre-demolition", icon: ScanSearch, title: "Сканер перед демонтажем", text: "Фото помещения → список элементов, которые стоит сохранить." },
  { to: "/ai/inspector", icon: FileBadge, title: "Цифровой паспорт", text: "Карточка материала: что указал продавец, что предположил ИИ." },
];

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [latest, setLatest] = useState<ListingWithSeller[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [fav, setFav] = useState<string[]>([]);

  useEffect(() => {
    api.listListings({ sort: "new" }).then((l) => setLatest(l.slice(0, 8)));
    api.categoryCounts().then(setCounts);
    api.favoriteIds().then(setFav);
  }, [user]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-sage/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-ai/10 blur-3xl" />
        <div className="container-page relative py-16 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sage">
            <Leaf className="h-3.5 w-3.5" /> Маркетплейс повторного использования
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Вторая жизнь строительных материалов
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
            Продавайте остатки после ремонта, находите недорогие б/у материалы рядом и подбирайте их под свой проект с помощью ИИ.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
            }}
            className="mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Кирпич, плитка, доска, раковина…" className="h-12 border-0 pl-11 text-base focus:ring-0" />
            </div>
            <Button size="lg" type="submit">Найти материалы</Button>
          </form>
          <Link to="/ai/project-planner" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ai px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-95">
            <Sparkles className="h-4 w-4" /> Подобрать материалы для моего проекта <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Категории */}
      <section className="container-page mt-14">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Категории</h2>
          <Link to="/catalog" className="text-sm font-medium text-primary hover:underline">Весь каталог</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id];
            return (
              <Link key={c.id} to={`/catalog?category=${c.id}`} className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-primary/40 hover:shadow-card">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sage-light text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{c.name}</p>
                  <p className="text-xs text-ink-muted">{counts[c.id] ?? 0} объявл.</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Последние объявления */}
      <section className="container-page mt-14">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Свежие объявления</h2>
          <Link to="/catalog" className="text-sm font-medium text-primary hover:underline">Смотреть все</Link>
        </div>
        <ListingGrid items={latest} favIds={fav} />
      </section>

      {/* Как работает */}
      <section className="container-page mt-20">
        <h2 className="text-2xl font-bold tracking-tight">Как работает QaitaBuild</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Upload, t: "Разместите остатки", d: "Сфотографируйте материал — ИИ подскажет тип, состояние и составит паспорт." },
            { icon: Search, t: "Найдите нужное", d: "Ищите по категориям и городам или опишите проект — ИИ подберёт варианты." },
            { icon: Handshake, t: "Договоритесь напрямую", d: "Свяжитесь с продавцом по телефону или WhatsApp и заберите материал." },
          ].map((s, i) => (
            <div key={s.t} className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-white">{i + 1}</span>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-4 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI */}
      <section className="container-page mt-20">
        <div className="rounded-3xl bg-ink p-6 text-white sm:p-10">
          <div className="flex items-center gap-2 text-ai"><Sparkles className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">Искусственный интеллект</span></div>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight">Пять AI-инструментов, которые помогают не выбрасывать материалы</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_TOOLS.map((t) => (
              <Link key={t.title} to={t.to} className={`group rounded-2xl p-5 transition ${t.main ? "bg-ai text-ink lg:row-span-2" : "bg-white/5 hover:bg-white/10"}`}>
                <t.icon className={`h-6 w-6 ${t.main ? "" : "text-ai"}`} />
                <p className="mt-3 font-semibold">{t.title}</p>
                <p className={`mt-1 text-sm ${t.main ? "text-ink/75" : "text-white/60"}`}>{t.text}</p>
                {t.main && <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">Попробовать <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>}
              </Link>
            ))}
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs text-white/50">
            <Hammer className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ИИ делает предварительный визуальный анализ и не заменяет проверку специалистом.
          </p>
        </div>
      </section>
    </>
  );
}
