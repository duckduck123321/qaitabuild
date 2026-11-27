/**
 * Вызов AI-инструментов через Supabase Edge Function "ai" (supabase/functions/ai).
 * Ключ Gemini хранится только в Supabase Secrets — в коде сайта его нет.
 */
import { supabase } from "./backend-supabase";
import { listListings } from "./api";
import type { CategoryId, ConditionId } from "./constants";
import type { ListingWithSeller } from "./types";

export interface ReusePlan {
  summary: string;
  materials: {
    name: string;
    category: CategoryId;
    quantity: string;
    reuse_alternative: string;
    reason: string;
    search_keywords: string[];
  }[];
  tips: string[];
}

export interface Inspection {
  is_construction_material: boolean;
  material_type: string;
  suggested_title: string;
  category: CategoryId;
  condition: ConditionId;
  confidence: "low" | "medium" | "high";
  visual_condition: string;
  visible_defects: string[];
  recovery_recommendations: string[];
  reuse_recommendations: string[];
  suitability_note: string;
  questions_for_user: string[];
}

export interface RecoveryPlan {
  material_type: string;
  problems: string[];
  cleaning: string[];
  restoration: string[];
  reuse_options: string[];
  required_checks: string[];
  not_worth_it_if: string[];
}

export interface DemolitionScan {
  room: string;
  elements: { name: string; category: CategoryId; why_save: string; reuse_options: string[]; removal_note: string }[];
  general_note: string;
}

type Results = { reuse_planner: ReusePlan; inspector: Inspection; recovery: RecoveryPlan; pre_demolition: DemolitionScan };

export const aiAvailable = Boolean(supabase);

/** Адрес (slug) Edge Function в Supabase. По умолчанию "ai". */
const AI_FUNCTION = (import.meta.env.VITE_AI_FUNCTION as string | undefined) || "ai";

export async function runAi<T extends keyof Results>(type: T, payload: { text?: string; image?: string }): Promise<Results[T]> {
  if (!supabase) throw new Error("AI работает только с подключённым Supabase");
  const { data, error } = await supabase.functions.invoke(AI_FUNCTION, { body: { type, ...payload } });
  if (error) {
    // Текст ошибки от функции лежит в теле ответа
    let msg = "AI-сервис недоступен. Проверьте, что функция ai развёрнута в Supabase";
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) msg = body.error;
    } catch {
      /* тело не JSON */
    }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  saveAnalysis(type, payload, data.result);
  return data.result;
}

/** Сохраняем анализ в историю (только для вошедших пользователей, ошибки не мешают работе). */
async function saveAnalysis(type: string, payload: { text?: string; image?: string }, result: unknown) {
  try {
    const { data } = await supabase!.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    await supabase!.from("ai_analyses").insert({
      user_id: userId,
      analysis_type: type,
      input_data: { text: payload.text ?? null, has_image: Boolean(payload.image) },
      result,
    });
  } catch {
    /* история — не критично */
  }
}

export async function aiHistory(): Promise<{ id: string; analysis_type: keyof Results; input_data: { text?: string }; result: any; created_at: string }[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("ai_analyses").select("*").order("created_at", { ascending: false }).limit(30);
  return data ?? [];
}

/** Упрощённая основа слова для поиска: «плитку» и «плитка» → «плит». */
const stem = (w: string) => {
  const s = w.toLowerCase().trim().replace(/[^а-яёa-z0-9-]/gi, "");
  return s.length > 5 ? s.slice(0, -2) : s;
};

/**
 * Ищет реальные объявления под материал из плана.
 * Сначала по ключевым словам внутри категории, затем по словам во всём каталоге.
 * Если ничего не нашлось — возвращает пустой список (честно показываем «нет в каталоге»).
 */
export async function findListingsFor(m: ReusePlan["materials"][number], limit = 4): Promise<ListingWithSeller[]> {
  const words = [...new Set(m.search_keywords.map(stem).filter((w) => w.length >= 3))].slice(0, 4);
  const found = new Map<string, ListingWithSeller>();
  for (const w of words) for (const l of await listListings({ q: w, category: m.category })) found.set(l.id, l);
  if (!found.size) for (const w of words) for (const l of await listListings({ q: w })) found.set(l.id, l);
  // Если слово есть в названии — это точное попадание; совпадения только в описании показываем, лишь когда точных нет
  const all = [...found.values()];
  const inTitle = all.filter((l) => words.some((w) => l.title.toLowerCase().includes(w)));
  return (inTitle.length ? inTitle : all).slice(0, limit);
}
