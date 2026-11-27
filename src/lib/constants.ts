export const CATEGORIES = [
  { id: "bricks_blocks", name: "Кирпич и блоки" },
  { id: "wood_lumber", name: "Древесина и пиломатериалы" },
  { id: "metal", name: "Металл" },
  { id: "tiles", name: "Плитка и керамогранит" },
  { id: "doors_windows", name: "Двери и окна" },
  { id: "plumbing", name: "Сантехника" },
  { id: "electrical", name: "Электрика" },
  { id: "roofing", name: "Кровельные материалы" },
  { id: "finishing", name: "Отделочные материалы" },
  { id: "other", name: "Другие материалы" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? "Другие материалы";

export const CITIES = [
  "Алматы",
  "Астана",
  "Шымкент",
  "Караганда",
  "Актобе",
  "Павлодар",
  "Усть-Каменогорск",
  "Атырау",
  "Другой",
];

export const CONDITIONS = [
  { id: "new", name: "Новое (остаток)" },
  { id: "excellent", name: "Отличное" },
  { id: "good", name: "Хорошее" },
  { id: "fair", name: "Удовлетворительное" },
  { id: "needs_repair", name: "Требует восстановления" },
] as const;

export type ConditionId = (typeof CONDITIONS)[number]["id"];

export const conditionName = (id: string) => CONDITIONS.find((c) => c.id === id)?.name ?? id;

export const UNITS = ["шт", "м²", "м³", "м", "пог. м", "кг", "т", "упак.", "комплект"];

export const formatPrice = (n: number) => (n === 0 ? "Бесплатно" : `${n.toLocaleString("ru-RU")} ₸`);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
