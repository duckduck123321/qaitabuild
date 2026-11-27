import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ImagePlus, X, Sparkles, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";
import { CATEGORIES, CITIES, CONDITIONS, UNITS } from "@/lib/constants";
import type { CategoryId, ConditionId } from "@/lib/constants";
import type { ListingInput, Passport } from "@/lib/types";
import { aiAvailable, runAi } from "@/lib/ai";
import type { Inspection } from "@/lib/ai";
import { compressImage } from "@/lib/image";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { PassportView } from "@/components/listing";

const MAX_PHOTOS = 5;

/** Ответ AI Material Inspector → цифровой паспорт (пока как «предположение ИИ»). */
const toPassport = (r: Inspection): Passport => ({
  materialType: r.material_type,
  visualCondition: r.visual_condition,
  visibleDefects: r.visible_defects,
  recoveryRecommendations: r.recovery_recommendations,
  reuseRecommendations: r.reuse_recommendations,
  verificationStatus: "ai_suggested",
  createdAt: new Date().toISOString(),
});

export default function ListingForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const routeState = useLocation().state as { image?: string; inspection?: Inspection } | null;
  const [fromInspector] = useState<{ image?: string; inspection?: Inspection } | null>(() => {
    if (routeState?.inspection || editing) return routeState;
    try {
      const raw = sessionStorage.getItem("qb-pending-inspection");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [aiNote, setAiNote] = useState("");

  const [f, setF] = useState<ListingInput>(() => {
    const base: ListingInput = {
      title: sp.get("title") ?? "",
      description: "",
      category: (sp.get("category") as CategoryId) ?? "bricks_blocks",
      price: 0,
      quantity: 1,
      unit: "шт",
      condition: "good",
      city: user?.city ?? "Алматы",
      images: fromInspector?.image ? [fromInspector.image] : [],
    };
    const r = fromInspector?.inspection;
    return r ? { ...base, title: r.suggested_title, category: r.category, condition: r.condition, passport: toPassport(r) } : base;
  });

  // Данные из анализа фото уже в форме — очищаем «отложенный» результат
  useEffect(() => {
    try { sessionStorage.removeItem("qb-pending-inspection"); } catch { /* недоступно */ }
  }, []);

  const analyze = async () => {
    setAiErr("");
    setAiNote("");
    setAiBusy(true);
    try {
      const r = await runAi("inspector", { image: f.images[0], text: f.title ? `Продавец называет материал: ${f.title}` : undefined });
      if (!r.is_construction_material) {
        setAiErr("ИИ считает, что на первом фото не строительный материал. Попробуйте другое фото.");
        return;
      }
      setF((p) => ({ ...p, title: p.title.trim() || r.suggested_title, category: r.category, condition: r.condition, passport: toPassport(r) }));
      setAiNote(r.questions_for_user.length ? `ИИ советует указать в описании: ${r.questions_for_user.join("; ")}` : "");
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    api.getListing(id).then((l) => {
      if (!l || l.sellerId !== user?.id) {
        nav("/account", { replace: true });
        return;
      }
      const { id: _i, sellerId: _s, createdAt: _c, updatedAt: _u, seller: _sel, ...rest } = l;
      setF(rest);
      setLoading(false);
    });
  }, [id, user, nav]);

  const upd = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => setF((p) => ({ ...p, [k]: v }));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setErr("");
    try {
      const room = MAX_PHOTOS - f.images.length;
      const list = Array.from(files).slice(0, room);
      const urls = await Promise.all(list.map((file) => compressImage(file)));
      upd("images", [...f.images, ...urls]);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!f.title.trim()) return setErr("Укажите название материала");
    if (f.images.length === 0) return setErr("Добавьте хотя бы одно фото");
    if (!(f.quantity > 0)) return setErr("Количество должно быть больше нуля");
    if (f.price < 0) return setErr("Цена не может быть отрицательной");
    setBusy(true);
    try {
      const saved = editing ? await api.updateListing(id!, f) : await api.createListing(f);
      nav(`/listing/${saved.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container-page max-w-3xl py-8">
      <button onClick={() => nav(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>
      <h1 className="text-3xl font-bold tracking-tight">{editing ? "Редактировать объявление" : "Новое объявление"}</h1>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <Card className="space-y-4 p-6">
          <div>
            <Label required hint={`до ${MAX_PHOTOS} шт`}>Фотографии</Label>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {f.images.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => upd("images", f.images.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white" aria-label="Удалить фото">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">Обложка</span>}
                </div>
              ))}
              {f.images.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-ink-muted transition hover:border-primary hover:text-primary">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Добавить</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-ai-light/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-ai-dark" />
              <div>
                <p className="text-sm font-semibold">AI-анализ материала</p>
                <p className="text-xs text-ink-muted">
                  {f.images.length ? "ИИ определит тип, категорию, состояние и составит цифровой паспорт по первому фото." : "Сначала добавьте фото материала."}
                </p>
              </div>
            </div>
            <Button type="button" variant="ai" size="sm" onClick={analyze} loading={aiBusy} disabled={!aiAvailable || !f.images.length}>
              {f.passport ? "Повторить" : "Анализировать"}
            </Button>
          </div>
          {aiErr && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{aiErr}</p>}
          {aiNote && <p className="rounded-xl bg-ai-light/60 px-3.5 py-2.5 text-sm">{aiNote}</p>}
        </Card>

        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="block sm:col-span-2"><Label required>Название материала</Label>
            <Input value={f.title} onChange={(e) => upd("title", e.target.value)} placeholder="Например: Кирпич керамический красный, б/у" maxLength={100} />
          </label>
          <label className="block"><Label required>Категория</Label>
            <Select value={f.category} onChange={(e) => upd("category", e.target.value as CategoryId)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <label className="block"><Label required>Состояние</Label>
            <Select value={f.condition} onChange={(e) => upd("condition", e.target.value as ConditionId)}>
              {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <label className="block"><Label required>Количество</Label>
              <Input type="number" min={0} step="any" value={f.quantity} onChange={(e) => upd("quantity", Number(e.target.value))} />
            </label>
            <label className="block"><Label required>Ед.</Label>
              <Select value={f.unit} onChange={(e) => upd("unit", e.target.value)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select>
            </label>
          </div>
          <label className="block"><Label required hint={`за 1 ${f.unit}, 0 — бесплатно`}>Цена, ₸</Label>
            <Input type="number" min={0} value={f.price} onChange={(e) => upd("price", Number(e.target.value))} />
          </label>
          <label className="block"><Label required>Город</Label>
            <Select value={f.city} onChange={(e) => upd("city", e.target.value)}>{CITIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </label>
          {editing && (
            <label className="block"><Label>Статус</Label>
              <Select value={f.status} onChange={(e) => upd("status", e.target.value as "active" | "sold")}>
                <option value="active">Активно</option>
                <option value="sold">Продано</option>
              </Select>
            </label>
          )}
          <label className="block sm:col-span-2"><Label>Описание</Label>
            <Textarea value={f.description} onChange={(e) => upd("description", e.target.value)} placeholder="Откуда материал, как хранился, есть ли дефекты, условия самовывоза" />
          </label>
          <p className="text-xs text-ink-muted sm:col-span-2">
            Покупатели увидят ваш телефон из профиля: <span className="font-medium text-ink">{user?.phone}</span>
          </p>
        </Card>

        {f.passport && (
          <div className="space-y-3">
            <PassportView passport={f.passport} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#244D3C]"
                checked={f.passport.verificationStatus === "user_confirmed"}
                onChange={(e) => upd("passport", { ...f.passport!, verificationStatus: e.target.checked ? "user_confirmed" : "ai_suggested" })} />
              <span>Я проверил данные паспорта — они соответствуют материалу. <span className="text-ink-muted">Без отметки паспорт показывается как «Предположение ИИ».</span></span>
            </label>
            <button type="button" className="text-sm text-ink-muted underline-offset-2 hover:underline" onClick={() => upd("passport", undefined)}>Убрать паспорт из объявления</button>
          </div>
        )}

        {err && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{err}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="lg" loading={busy}>{editing ? "Сохранить изменения" : "Опубликовать"}</Button>
          <Button type="button" size="lg" variant="ghost" onClick={() => nav(-1)}>Отмена</Button>
        </div>
      </form>
    </div>
  );
}
