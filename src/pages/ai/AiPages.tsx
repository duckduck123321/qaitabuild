import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Camera, ClipboardList, Recycle, ScanSearch, Sparkles, ImagePlus, Info, ShieldAlert, PackageSearch, RotateCcw, Plus, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Button, Card, Textarea, cn } from "@/components/ui";
import { ListingImage } from "@/components/listing";
import { categoryName, conditionName, formatPrice } from "@/lib/constants";
import { compressImage } from "@/lib/image";
import { aiAvailable, findListingsFor, runAi } from "@/lib/ai";
import type { DemolitionScan, Inspection, RecoveryPlan, ReusePlan } from "@/lib/ai";
import type { ListingWithSeller } from "@/lib/types";
import { AI_TOOLS } from "../Home";

/* ---------- Общие элементы ---------- */

function NotConnected() {
  return (
    <div className="flex gap-3 rounded-xl border border-ai/40 bg-ai-light/60 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-ai-dark" />
      <p><span className="font-semibold">AI недоступен в демо-режиме.</span> Подключите Supabase (файл .env.local), чтобы анализ заработал.</p>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return msg ? (
    <div className="flex gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{msg}
    </div>
  ) : null;
}

function Disclaimer({ text }: { text: string }) {
  return (
    <p className="flex gap-2 text-xs text-ink-muted">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {text}
    </p>
  );
}

function ToolHeader({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="mb-6">
      <Link to="/ai" className="text-sm text-ink-muted hover:text-ink">← Все AI-инструменты</Link>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai text-ink"><Icon className="h-5 w-5" /></div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      <p className="mt-3 max-w-2xl text-ink-muted">{text}</p>
    </div>
  );
}

export function PhotoPicker({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-line">
          <img src={value} alt="" className="max-h-80 w-full object-contain bg-bg" />
          <button onClick={() => onChange(null)} className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Заменить</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg px-6 py-12 text-center text-ink-muted transition hover:border-ai hover:text-ink">
          <ImagePlus className="h-8 w-8" />
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="text-xs">Нажмите, чтобы выбрать фото · JPG, PNG до 10 МБ</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setErr("");
        try { onChange(await compressImage(f)); } catch (x) { setErr((x as Error).message); }
      }} />
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

function List({ title, items, tone = "ai" }: { title: string; items: string[]; tone?: "ai" | "red" | "green" }) {
  if (!items?.length) return null;
  const dot = { ai: "bg-ai", red: "bg-red-500", green: "bg-primary" }[tone];
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((t) => <li key={t} className="flex gap-2"><span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />{t}</li>)}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Thinking({ text }: { text: string }) {
  return (
    <Card className="flex items-center gap-3 p-6 text-sm text-ink-muted">
      <Sparkles className="h-5 w-5 animate-pulse text-ai" /> {text}
    </Card>
  );
}

/* ---------- Хаб ---------- */

export function AiHub() {
  return (
    <div className="container-page py-10">
      <div className="flex items-center gap-2 text-ai-dark"><Sparkles className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wide">AI-инструменты</span></div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Умные помощники для повторного использования</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">Все инструменты делают предварительный визуальный анализ. Они помогают принять решение, но не заменяют проверку специалистом.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {AI_TOOLS.filter((t) => t.title !== "Цифровой паспорт").map((t) => (
          <Link key={t.title} to={t.to} className="group flex gap-4 rounded-2xl border border-line bg-white p-6 transition hover:border-ai hover:shadow-card">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ai-light text-ai-dark"><t.icon className="h-6 w-6" /></div>
            <div>
              <p className="font-semibold">{t.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{t.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Открыть <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </div>
      <Card className="mt-4 flex gap-4 p-6">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sage-light text-primary"><Sparkles className="h-6 w-6" /></div>
        <div>
          <p className="font-semibold">Цифровой паспорт материала</p>
          <p className="mt-1 text-sm text-ink-muted">Создаётся из анализа фото при размещении объявления. Примеры — в объявлениях с меткой «AI-паспорт» в каталоге.</p>
        </div>
      </Card>
    </div>
  );
}

/* ---------- AI-2. Project Reuse Planner ---------- */

const EXAMPLES = [
  "Ремонт ванной 6 м²: нужна плитка на пол и стены, раковина и смеситель. Хочу по максимуму использовать б/у.",
  "Строю забор и клумбы на даче, нужен кирпич и что-то для столбов.",
  "Делаю мебель для гаража — стеллажи и верстак из дерева.",
];

function MiniListing({ l }: { l: ListingWithSeller }) {
  return (
    <Link to={`/listing/${l.id}`} className="flex gap-3 rounded-xl border border-line bg-white p-2 transition hover:border-primary/40 hover:shadow-card">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg"><ListingImage listing={l} /></div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{l.title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{formatPrice(l.price)}{l.price > 0 && ` / ${l.unit}`} · {l.city}</p>
      </div>
    </Link>
  );
}

export function ProjectPlanner() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState<ReusePlan | null>(null);
  const [matches, setMatches] = useState<ListingWithSeller[][]>([]);

  const run = async () => {
    setErr("");
    setBusy(true);
    setPlan(null);
    try {
      const p = await runAi("reuse_planner", { text });
      const found = await Promise.all(p.materials.map((m) => findListingsFor(m)));
      setPlan(p);
      setMatches(found);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const totalFound = matches.reduce((s, m) => s + m.length, 0);

  return (
    <div className="container-page max-w-4xl py-10">
      <ToolHeader icon={ClipboardList} title="Подбор материалов под проект"
        text="Опишите, что вы строите или ремонтируете. ИИ выделит нужные материалы, предложит, что можно взять б/у, и покажет реальные объявления из каталога." />
      <Card className="space-y-4 p-6">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Например: ремонт кухни 9 м², нужна плитка на фартук, мойка и ламинат…" className="min-h-[140px] text-base" maxLength={2000} />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => setText(e)} className="rounded-full border border-line px-3 py-1.5 text-left text-xs text-ink-muted transition hover:border-primary hover:text-primary">
              {e.length > 60 ? e.slice(0, 58) + "…" : e}
            </button>
          ))}
        </div>
        {!aiAvailable && <NotConnected />}
        <ErrorBox msg={err} />
        <Button variant="ai" size="lg" onClick={run} loading={busy} disabled={!aiAvailable || text.trim().length < 10}>
          <Sparkles className="h-4 w-4" /> Подобрать материалы
        </Button>
      </Card>

      {busy && <div className="mt-6"><Thinking text="ИИ разбирает проект и ищет подходящие объявления…" /></div>}

      {plan && (
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl bg-ink p-6 text-white">
            <div className="flex items-center gap-2 text-ai"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">План ИИ</span></div>
            <p className="mt-2 text-lg">{plan.summary}</p>
            <p className="mt-3 text-sm text-white/60">
              Материалов в плане: {plan.materials.length} · найдено объявлений в каталоге: {totalFound}
            </p>
          </div>

          {plan.materials.map((m, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{m.name}</p>
                  <p className="text-sm text-ink-muted">{categoryName(m.category)} · {m.quantity}</p>
                </div>
                {matches[i]?.length ? <Badge tone="green">Есть в каталоге: {matches[i].length}</Badge> : <Badge>Нет в каталоге</Badge>}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Альтернатива б/у"><span className="font-medium">{m.reuse_alternative}</span></Field>
                <Field label="Почему">{m.reason}</Field>
              </div>
              <div className="mt-4">
                {matches[i]?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">{matches[i].map((l) => <MiniListing key={l.id} l={l} />)}</div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-bg px-4 py-3 text-sm text-ink-muted">
                    <PackageSearch className="h-4 w-4 shrink-0" />
                    Сейчас подходящих объявлений нет.{" "}
                    <Link to={`/catalog?category=${m.category}`} className="font-medium text-primary hover:underline">Посмотреть категорию</Link>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {plan.tips.length > 0 && <Card className="p-5"><List title="Советы" items={plan.tips} tone="green" /></Card>}
          <Disclaimer text="Рекомендации ИИ предварительные. Объявления — реальные из каталога QaitaBuild; состояние материала проверяйте при встрече." />
        </div>
      )}
    </div>
  );
}

/* ---------- Фото-инструменты ---------- */

function usePhotoTool<T>(type: "inspector" | "recovery" | "pre_demolition") {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<T | null>(null);
  const run = async () => {
    if (!image) return;
    setErr("");
    setBusy(true);
    setResult(null);
    try {
      setResult((await runAi(type, { image })) as T);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => { setImage(null); setResult(null); setErr(""); };
  return { image, setImage, busy, err, result, run, reset };
}

function PhotoToolLayout({ icon, title, text, drop, disclaimer, tool, children }: {
  icon: LucideIcon; title: string; text: string; drop: string; disclaimer: string;
  tool: ReturnType<typeof usePhotoTool<unknown>>; children?: ReactNode;
}) {
  return (
    <div className="container-page max-w-4xl py-10">
      <ToolHeader icon={icon} title={title} text={text} />
      <Card className="space-y-4 p-6">
        <PhotoPicker value={tool.image} onChange={(v) => { tool.setImage(v); }} label={drop} />
        {!aiAvailable && <NotConnected />}
        <ErrorBox msg={tool.err} />
        <div className="flex flex-wrap gap-2">
          <Button variant="ai" size="lg" onClick={tool.run} loading={tool.busy} disabled={!aiAvailable || !tool.image}>
            <Sparkles className="h-4 w-4" /> Анализировать
          </Button>
          {tool.result != null && <Button variant="ghost" size="lg" onClick={tool.reset}><RotateCcw className="h-4 w-4" /> Новое фото</Button>}
        </div>
        <Disclaimer text={disclaimer} />
      </Card>
      {tool.busy && <div className="mt-6"><Thinking text="ИИ рассматривает фото…" /></div>}
      {children}
    </div>
  );
}

const CONFIDENCE = { low: "низкая", medium: "средняя", high: "высокая" };

export function InspectionCard({ r }: { r: Inspection }) {
  if (!r.is_construction_material)
    return <Card className="p-6 text-sm"><p className="font-semibold">Похоже, на фото не строительный материал.</p><p className="mt-1 text-ink-muted">{r.visual_condition}</p></Card>;
  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ai-dark">Предположение ИИ</p>
          <p className="mt-1 text-xl font-semibold">{r.material_type}</p>
          <p className="text-sm text-ink-muted">{categoryName(r.category)} · состояние: {conditionName(r.condition)}</p>
        </div>
        <Badge tone="ai">Уверенность: {CONFIDENCE[r.confidence]}</Badge>
      </div>
      <Field label="Визуальное состояние">{r.visual_condition}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <List title="Видимые дефекты" items={r.visible_defects} tone="red" />
        <List title="Как восстановить" items={r.recovery_recommendations} />
        <List title="Где применить" items={r.reuse_recommendations} tone="green" />
        <List title="Что уточнить" items={r.questions_for_user} />
      </div>
      <div className="rounded-xl bg-ai-light/60 p-3 text-sm">{r.suitability_note}</div>
    </Card>
  );
}

export function Inspector() {
  const nav = useNavigate();
  const tool = usePhotoTool<Inspection>("inspector");
  return (
    <PhotoToolLayout icon={Camera} title="Анализ материала по фото" tool={tool as never}
      text="Загрузите фото стройматериала — ИИ предположит его тип, найдёт видимые дефекты и даст предварительную оценку пригодности."
      drop="Фото материала"
      disclaimer="ИИ не определяет прочность и безопасность по фото и не оценивает пригодность для несущих конструкций.">
      {tool.result && (
        <div className="mt-6 space-y-4">
          <InspectionCard r={tool.result} />
          {tool.result.is_construction_material && (
            <Button size="lg" onClick={() => {
              // Сохраняем результат, чтобы он не потерялся, если сначала понадобится войти в аккаунт
              try { sessionStorage.setItem("qb-pending-inspection", JSON.stringify({ image: tool.image, inspection: tool.result })); } catch { /* нет места */ }
              nav("/listing/new");
            }}>
              <Plus className="h-4 w-4" /> Разместить объявление с этими данными
            </Button>
          )}
        </div>
      )}
    </PhotoToolLayout>
  );
}

export function Recovery() {
  const tool = usePhotoTool<RecoveryPlan>("recovery");
  const r = tool.result;
  return (
    <PhotoToolLayout icon={Recycle} title="План восстановления" tool={tool as never}
      text="Узнайте, как очистить и восстановить материал, где его можно применить и когда восстановление нецелесообразно."
      drop="Фото материала"
      disclaimer="Не используйте повреждённые материалы в ответственных конструкциях без заключения специалиста.">
      {r && (
        <Card className="mt-6 space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ai-dark">Предположение ИИ</p>
            <p className="mt-1 text-xl font-semibold">{r.material_type}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <List title="Видимые проблемы" items={r.problems} tone="red" />
            <List title="Очистка" items={r.cleaning} />
            <List title="Восстановление" items={r.restoration} />
            <List title="Где применить" items={r.reuse_options} tone="green" />
            <List title="Что проверить перед использованием" items={r.required_checks} />
            <List title="Когда восстанавливать не стоит" items={r.not_worth_it_if} tone="red" />
          </div>
        </Card>
      )}
    </PhotoToolLayout>
  );
}

export function PreDemolition() {
  const nav = useNavigate();
  const tool = usePhotoTool<DemolitionScan>("pre_demolition");
  const r = tool.result;
  return (
    <PhotoToolLayout icon={ScanSearch} title="Сканер перед демонтажем" tool={tool as never}
      text="Загрузите фото помещения перед ремонтом — ИИ составит список элементов, которые, возможно, стоит сохранить и продать или использовать снова."
      drop="Фото комнаты или помещения"
      disclaimer="Анализ предварительный. Скрытые коммуникации, прочность и безопасность демонтажа ИИ не оценивает.">
      {r && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-ink p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-ai">На фото</p>
            <p className="mt-1 text-lg">{r.room}</p>
            <p className="mt-2 text-sm text-white/60">Возможно, эти элементы можно сохранить и использовать повторно. Перед демонтажем проверьте их фактическое состояние и возможность безопасного снятия.</p>
          </div>
          {r.elements.length === 0 && <Card className="p-6 text-sm text-ink-muted">ИИ не нашёл на фото элементов, которые явно стоит сохранить.</Card>}
          {r.elements.map((el, i) => (
            <Card key={i} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{el.name}</p>
                  <p className="text-sm text-ink-muted">{categoryName(el.category)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => nav(`/listing/new?title=${encodeURIComponent(el.name)}&category=${el.category}`)}>
                  <Plus className="h-4 w-4" /> Создать объявление
                </Button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Зачем сохранить">{el.why_save}</Field>
                <Field label="При снятии">{el.removal_note}</Field>
              </div>
              <div className="mt-4"><List title="Где применить" items={el.reuse_options} tone="green" /></div>
            </Card>
          ))}
          {r.general_note && <Card className="p-5 text-sm">{r.general_note}</Card>}
        </div>
      )}
    </PhotoToolLayout>
  );
}
