import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Heart, LayoutList, Settings, LogOut, Sparkles, PackageOpen } from "lucide-react";
import * as api from "@/lib/api";
import { CITIES, formatDate, formatPrice } from "@/lib/constants";
import type { Listing, ListingWithSeller } from "@/lib/types";
import { aiHistory } from "@/lib/ai";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, cn } from "@/components/ui";
import { ListingGrid, ListingImage } from "@/components/listing";

const TABS = [
  { id: "listings", label: "Мои объявления", icon: LayoutList },
  { id: "favorites", label: "Избранное", icon: Heart },
  { id: "ai", label: "AI-анализы", icon: Sparkles },
  { id: "settings", label: "Профиль", icon: Settings },
] as const;

export default function Account() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "listings";

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user!.fullName}</h1>
          <p className="text-sm text-ink-muted">{user!.email} · {user!.city}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => nav("/listing/new")}><Plus className="h-4 w-4" /> Разместить</Button>
          <Button variant="ghost" onClick={async () => { await logout(); nav("/"); }}><LogOut className="h-4 w-4" /> Выйти</Button>
        </div>
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setSp({ tab: t.id }, { replace: true })}
            className={cn("flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition", tab === t.id ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "listings" && <MyListings />}
        {tab === "favorites" && <Favorites />}
        {tab === "ai" && <AiHistory />}
        {tab === "settings" && <ProfileSettings />}
      </div>
    </div>
  );
}

function MyListings() {
  const nav = useNavigate();
  const [items, setItems] = useState<Listing[] | null>(null);
  const load = () => api.myListings().then(setItems);
  useEffect(() => { load(); }, []);

  if (!items) return <Spinner />;
  if (!items.length)
    return <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="У вас пока нет объявлений" text="Разместите остатки материалов — это займёт пару минут."
      action={<Button onClick={() => nav("/listing/new")}><Plus className="h-4 w-4" /> Разместить объявление</Button>} />;

  return (
    <div className="space-y-3">
      {items.map((l) => (
        <Card key={l.id} className="flex items-center gap-4 p-3">
          <Link to={`/listing/${l.id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-xl"><ListingImage listing={l} /></Link>
          <div className="min-w-0 flex-1">
            <Link to={`/listing/${l.id}`} className="line-clamp-1 font-medium hover:text-primary">{l.title}</Link>
            <p className="text-sm font-semibold">{formatPrice(l.price)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              {l.status === "sold" ? <Badge tone="red">Продано</Badge> : <Badge tone="green">Активно</Badge>}
              <span>{formatDate(l.createdAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => nav(`/listing/${l.id}/edit`)} aria-label="Редактировать"><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" aria-label="Удалить" onClick={async () => {
              if (!confirm(`Удалить «${l.title}»?`)) return;
              await api.deleteListing(l.id);
              load();
            }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Favorites() {
  const nav = useNavigate();
  const [items, setItems] = useState<ListingWithSeller[] | null>(null);
  useEffect(() => { api.favoriteListings().then(setItems); }, []);
  if (!items) return <Spinner />;
  if (!items.length)
    return <EmptyState icon={<Heart className="h-6 w-6" />} title="В избранном пусто" text="Нажимайте ♡ на карточках, чтобы сохранить интересные объявления."
      action={<Button variant="secondary" onClick={() => nav("/catalog")}>Перейти в каталог</Button>} />;
  return <ListingGrid items={items} favIds={items.map((i) => i.id)} />;
}

function ProfileSettings() {
  const { user, refresh } = useAuth();
  const [f, setF] = useState({ fullName: user!.fullName, city: user!.city, phone: user!.phone });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await api.updateProfile(f);
    await refresh();
    setBusy(false);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  };
  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><Label>Имя</Label><Input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></label>
        <label className="block"><Label>Город</Label><Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</Select></label>
        <label className="block"><Label hint="виден покупателям">Телефон</Label><Input required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy}>Сохранить</Button>
          {ok && <span className="text-sm text-primary">Сохранено ✓</span>}
        </div>
      </form>
    </Card>
  );
}

const AI_LABELS: Record<string, { label: string; to: string }> = {
  reuse_planner: { label: "Подбор под проект", to: "/ai/project-planner" },
  inspector: { label: "Анализ материала", to: "/ai/inspector" },
  recovery: { label: "План восстановления", to: "/ai/recovery" },
  pre_demolition: { label: "Сканер перед демонтажем", to: "/ai/pre-demolition" },
};

function aiSummary(type: string, r: any): string {
  if (type === "reuse_planner") return r.summary;
  if (type === "inspector") return `${r.material_type} — ${r.visual_condition}`;
  if (type === "recovery") return r.material_type;
  if (type === "pre_demolition") return `${r.room}: ${(r.elements ?? []).map((e: any) => e.name).join(", ")}`;
  return "";
}

function AiHistory() {
  const nav = useNavigate();
  const [items, setItems] = useState<Awaited<ReturnType<typeof aiHistory>> | null>(null);
  useEffect(() => { aiHistory().then(setItems); }, []);
  if (!items) return <Spinner />;
  if (!items.length)
    return <EmptyState icon={<Sparkles className="h-6 w-6" />} title="AI-анализов пока нет" text="Здесь сохраняются результаты подбора под проект и анализа фото."
      action={<Button variant="ai" onClick={() => nav("/ai")}>Открыть AI-инструменты</Button>} />;
  return (
    <div className="space-y-3">
      {items.map((a) => {
        const meta = AI_LABELS[a.analysis_type] ?? { label: a.analysis_type, to: "/ai" };
        return (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to={meta.to}><Badge tone="ai"><Sparkles className="h-3 w-3" /> {meta.label}</Badge></Link>
              <span className="text-xs text-ink-muted">{formatDate(a.created_at)}</span>
            </div>
            {a.input_data?.text && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">«{a.input_data.text}»</p>}
            <p className="mt-1 line-clamp-2 text-sm">{aiSummary(a.analysis_type, a.result)}</p>
          </Card>
        );
      })}
    </div>
  );
}
