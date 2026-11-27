// QaitaBuild — Edge Function "ai": прокси к Gemini для AI-инструментов.
// Ключ хранится в секрете GEMINI_API_KEY (Supabase → Edge Functions → Secrets).
// Модели можно сменить секретом GEMINI_MODEL — список через запятую, пробуются по очереди.
//
// Запрос:  POST { type: "reuse_planner" | "inspector" | "recovery" | "pre_demolition", text?: string, image?: "data:image/jpeg;base64,..." }
// Ответ:   { result: {...} }  или  { error: "текст ошибки" }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORY_IDS = [
  "bricks_blocks", "wood_lumber", "metal", "tiles", "doors_windows",
  "plumbing", "electrical", "roofing", "finishing", "other",
];
const CATEGORY_HELP =
  "bricks_blocks — кирпич и блоки; wood_lumber — древесина и пиломатериалы; metal — металл; " +
  "tiles — плитка и керамогранит; doors_windows — двери и окна; plumbing — сантехника; " +
  "electrical — электрика; roofing — кровельные материалы; finishing — отделочные материалы " +
  "(ламинат, гипсокартон, краска, обои); other — другое.";

const RULES = `
Ты — помощник маркетплейса QaitaBuild (Казахстан), где продают и покупают строительные материалы б/у и остатки после ремонта.
Отвечай только на русском языке, коротко и по делу.
Строгие правила:
- Ты делаешь только предварительный визуальный анализ. Никогда не утверждай, что материал прочный, безопасный или годится для несущих конструкций.
- Не придумывай цены, наличие товаров, марки и точные характеристики, которых не видно.
- Не советуй использовать повреждённые материалы в ответственных конструкциях. Если нужна проверка — так и скажи.
- Категории материалов: ${CATEGORY_HELP}`;

const str = { type: "STRING" };
const strList = { type: "ARRAY", items: str };
const category = { type: "STRING", enum: CATEGORY_IDS };

const TOOLS: Record<string, { needs: "text" | "image"; prompt: string; schema: unknown }> = {
  reuse_planner: {
    needs: "text",
    prompt: `${RULES}
Пользователь описывает свой строительный проект или ремонт. Задача:
1) выдели 3–7 материалов, которые понадобятся;
2) для каждого оцени примерное количество (если можно понять из описания, иначе "уточнить");
3) предложи, чем его можно заменить из б/у или остатков, и объясни почему;
4) дай 2–4 ключевых слова для поиска объявлений — короткие существительные в именительном падеже, как продавец назвал бы материал в объявлении (например: "плитка", "керамогранит", "раковина", "доска", "кирпич").
Если какой-то материал по соображениям безопасности лучше покупать новым (например, для несущих конструкций или газа), укажи это в reason.`,
    schema: {
      type: "OBJECT",
      properties: {
        summary: { ...str, description: "1–2 предложения: что за проект и общий совет" },
        materials: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: str,
              category,
              quantity: str,
              reuse_alternative: str,
              reason: str,
              search_keywords: strList,
            },
            required: ["name", "category", "quantity", "reuse_alternative", "reason", "search_keywords"],
          },
        },
        tips: { ...strList, description: "1–3 практических совета по работе с б/у материалами для этого проекта" },
      },
      required: ["summary", "materials", "tips"],
    },
  },

  inspector: {
    needs: "image",
    prompt: `${RULES}
Пользователь прислал фото строительного материала, который хочет продать или использовать повторно.
Опиши, что видно на фото: предполагаемый тип материала, видимые дефекты, визуальное состояние, как его можно восстановить и где применить повторно.
Предложи короткое название для объявления (до 60 символов).
Если на фото не строительный материал — поставь is_construction_material = false и кратко объясни в visual_condition.
Укажи, что ещё нужно уточнить у продавца (размеры, количество, наличие трещин и т. п.).`,
    schema: {
      type: "OBJECT",
      properties: {
        is_construction_material: { type: "BOOLEAN" },
        material_type: str,
        suggested_title: str,
        category,
        condition: { type: "STRING", enum: ["new", "excellent", "good", "fair", "needs_repair"] },
        confidence: { type: "STRING", enum: ["low", "medium", "high"] },
        visual_condition: str,
        visible_defects: strList,
        recovery_recommendations: strList,
        reuse_recommendations: strList,
        suitability_note: str,
        questions_for_user: strList,
      },
      required: [
        "is_construction_material", "material_type", "suggested_title", "category", "condition", "confidence",
        "visual_condition", "visible_defects", "recovery_recommendations", "reuse_recommendations",
        "suitability_note", "questions_for_user",
      ],
    },
  },

  recovery: {
    needs: "image",
    prompt: `${RULES}
Пользователь прислал фото материала и хочет понять, можно ли его восстановить и использовать снова.
Опиши видимые проблемы, способы очистки и восстановления, варианты повторного применения, какие проверки нужны перед использованием и в каких случаях восстанавливать нецелесообразно.`,
    schema: {
      type: "OBJECT",
      properties: {
        material_type: str,
        problems: strList,
        cleaning: strList,
        restoration: strList,
        reuse_options: strList,
        required_checks: strList,
        not_worth_it_if: strList,
      },
      required: ["material_type", "problems", "cleaning", "restoration", "reuse_options", "required_checks", "not_worth_it_if"],
    },
  },

  pre_demolition: {
    needs: "image",
    prompt: `${RULES}
Пользователь прислал фото помещения перед ремонтом или демонтажем.
Найди видимые строительные элементы, которые потенциально можно аккуратно снять и использовать повторно или продать (двери, окна, плитка, сантехника, радиаторы, паркет, кирпич, металл, фасады мебели и т. п.).
Для каждого объясни, зачем его сохранить, где применить и на что обратить внимание при снятии.
Не делай выводов о скрытых коммуникациях, прочности и безопасности конструкций.`,
    schema: {
      type: "OBJECT",
      properties: {
        room: { ...str, description: "Что за помещение на фото" },
        elements: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: str,
              category,
              why_save: str,
              reuse_options: strList,
              removal_note: str,
            },
            required: ["name", "category", "why_save", "reuse_options", "removal_note"],
          },
        },
        general_note: str,
      },
      required: ["room", "elements", "general_note"],
    },
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Только POST" }, 405);

  try {
    const { type, text, image } = await req.json();
    const tool = TOOLS[type];
    if (!tool) return json({ error: "Неизвестный тип анализа" }, 400);

    const parts: unknown[] = [];
    if (tool.needs === "text") {
      const t = String(text ?? "").trim();
      if (t.length < 10) return json({ error: "Опишите проект чуть подробнее" }, 400);
      if (t.length > 2000) return json({ error: "Описание слишком длинное (до 2000 символов)" }, 400);
      parts.push({ text: t });
    } else {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(image ?? ""));
      if (!m) return json({ error: "Загрузите фото в формате JPG, PNG или WebP" }, 400);
      if (m[2].length > 8_000_000) return json({ error: "Фото слишком большое" }, 400);
      parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
      parts.push({ text: String(text ?? "").slice(0, 500) || "Проанализируй фото." });
    }

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "AI не настроен: добавьте секрет GEMINI_API_KEY в Supabase" }, 500);
    const models = (Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-latest")
      .split(",").map((m) => m.trim()).filter(Boolean);
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: tool.prompt }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema: tool.schema, temperature: 0.4 },
    });

    // Пробуем модели по очереди: если одна недоступна или упёрлась в лимит — берём следующую
    let res: Response | null = null;
    let lastStatus = 0;
    let lastDetail = "";
    for (const model of models) {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
      });
      if (res.ok) break;
      lastStatus = res.status;
      lastDetail = await res.text();
      console.error("Gemini error", model, res.status, lastDetail);
      if (res.status === 400 && /API key/i.test(lastDetail)) return json({ error: "Неверный ключ GEMINI_API_KEY" }, 500);
      if (![404, 429, 500, 503].includes(res.status)) break;
      res = null;
    }

    if (!res || !res.ok) {
      if (lastStatus === 429) return json({ error: "Бесплатный лимит AI на минуту исчерпан. Подождите немного и попробуйте снова" }, 429);
      if (lastStatus === 404) return json({ error: "Модели Gemini недоступны. Задайте другие в секрете GEMINI_MODEL" }, 500);
      return json({ error: "AI-сервис временно недоступен. Попробуйте позже" }, 502);
    }

    const data = await res.json();
    const out = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    if (!out) return json({ error: "AI не смог ответить на этот запрос. Попробуйте переформулировать" }, 502);
    return json({ result: JSON.parse(out) });
  } catch (e) {
    console.error(e);
    return json({ error: "Не удалось обработать ответ AI. Попробуйте ещё раз" }, 500);
  }
});
