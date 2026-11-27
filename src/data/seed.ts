import type { Listing, Profile } from "@/lib/types";

/**
 * Тестовые данные для демо. На этапе подключения Supabase эти же записи
 * загружаются в базу SQL-скриптом (seed), а файл перестаёт использоваться.
 */

const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const SEED_PROFILES: Profile[] = [
  { id: "u-aidar", fullName: "Айдар Сериков", email: "aidar@demo.kz", city: "Алматы", phone: "+7 701 123 45 67", createdAt: day(60) },
  { id: "u-dana", fullName: "Дана Ермекова", email: "dana@demo.kz", city: "Астана", phone: "+7 702 234 56 78", createdAt: day(45) },
  { id: "u-brigada", fullName: "Бригада «ДомСтрой»", email: "domstroy@demo.kz", city: "Алматы", phone: "+7 705 345 67 89", createdAt: day(90) },
  { id: "u-marat", fullName: "Марат Ахметов", email: "marat@demo.kz", city: "Шымкент", phone: "+7 707 456 78 90", createdAt: day(30) },
  { id: "u-ksenia", fullName: "Ксения Ли", email: "ksenia@demo.kz", city: "Караганда", phone: "+7 708 567 89 01", createdAt: day(20) },
];

type S = Omit<Listing, "id" | "createdAt" | "updatedAt" | "status" | "images"> & { d: number; images?: string[] };

const raw: S[] = [
  // Кирпич и блоки
  { sellerId: "u-brigada", title: "Кирпич керамический красный, б/у", description: "Остался после разбора перегородки. Очищен от раствора примерно на 80%. Есть небольшие сколы на углах. Подойдёт для забора, клумб, хозпостроек.", category: "bricks_blocks", price: 45, quantity: 1200, unit: "шт", condition: "good", city: "Алматы", d: 1,
    passport: { materialType: "Керамический полнотелый кирпич", visualCondition: "Следы раствора, небольшие сколы на углах", visibleDefects: ["Сколы на углах", "Остатки цементного раствора"], recoveryRecommendations: ["Очистить остатки раствора скребком", "Отбраковать кирпичи с трещинами"], reuseRecommendations: ["Садовые дорожки и бордюры", "Ненесущие перегородки в хозпостройках", "Мангальная зона (не топка)"], verificationStatus: "user_confirmed", createdAt: day(1) } },
  { sellerId: "u-aidar", title: "Газоблок D500 600×300×200", description: "Остаток после строительства дома. Хранились под навесом на поддоне. Около 2,5 м³.", category: "bricks_blocks", price: 18000, quantity: 2.5, unit: "м³", condition: "new", city: "Алматы", d: 3 },
  { sellerId: "u-marat", title: "Шлакоблок, 300 шт", description: "Разобрали старый сарай. Блоки крепкие, местами отбитые края. Самовывоз.", category: "bricks_blocks", price: 120, quantity: 300, unit: "шт", condition: "fair", city: "Шымкент", d: 9 },
  { sellerId: "u-ksenia", title: "Облицовочный кирпич бежевый", description: "Купили с запасом, осталось 2 поддона. Новый, в плёнке.", category: "bricks_blocks", price: 95, quantity: 640, unit: "шт", condition: "new", city: "Караганда", d: 12 },

  // Древесина
  { sellerId: "u-aidar", title: "Доска обрезная сосна 50×150×6000", description: "Использовалась как опалубка один раз. Следы бетона, без гнили. Можно строгать.", category: "wood_lumber", price: 2200, quantity: 40, unit: "шт", condition: "good", city: "Алматы", d: 2,
    passport: { materialType: "Сосновая обрезная доска", visualCondition: "Следы бетона на поверхности, древесина сухая", visibleDefects: ["Следы бетона", "Отверстия от гвоздей"], recoveryRecommendations: ["Удалить гвозди", "Острогать или отшлифовать поверхность", "Проверить на гниль и жучка"], reuseRecommendations: ["Стеллажи и мебель для гаража", "Грядки и садовые короба", "Повторная опалубка"], verificationStatus: "ai_suggested", createdAt: day(2) } },
  { sellerId: "u-dana", title: "Старый дубовый паркет, ~18 м²", description: "Сняли при ремонте квартиры в сталинке. Штучный, ёлочкой. Нужна циклёвка, некоторые планки с трещинами.", category: "wood_lumber", price: 3500, quantity: 18, unit: "м²", condition: "needs_repair", city: "Астана", d: 5 },
  { sellerId: "u-brigada", title: "Брус 100×100, обрезки 1–2 м", description: "Обрезки после монтажа каркаса. Около 60 штук разной длины. Отдам недорого.", category: "wood_lumber", price: 400, quantity: 60, unit: "шт", condition: "good", city: "Алматы", d: 7 },
  { sellerId: "u-ksenia", title: "Вагонка липа, класс А", description: "Осталась после отделки бани. 3 упаковки по 10 шт, длина 2 м.", category: "wood_lumber", price: 9000, quantity: 3, unit: "упак.", condition: "new", city: "Караганда", d: 15 },

  // Металл
  { sellerId: "u-marat", title: "Профильная труба 40×20, б/у", description: "Демонтировали навес. Около 60 погонных метров, есть поверхностная ржавчина.", category: "metal", price: 550, quantity: 60, unit: "пог. м", condition: "fair", city: "Шымкент", d: 4 },
  { sellerId: "u-brigada", title: "Арматура А500 12 мм, остатки", description: "Обрезки длиной 1,5–4 м после заливки фундамента. Примерно 300 кг.", category: "metal", price: 180, quantity: 300, unit: "кг", condition: "good", city: "Алматы", d: 6 },
  { sellerId: "u-aidar", title: "Металлическая лестница-стремянка", description: "Самодельная, сварная, высота 2 м. Крепкая, нужна покраска.", category: "metal", price: 15000, quantity: 1, unit: "шт", condition: "fair", city: "Алматы", d: 20 },

  // Плитка
  { sellerId: "u-dana", title: "Керамогранит 60×60 серый матовый", description: "Остаток после ремонта ванной: 2 полные коробки + россыпь. Всего около 4,3 м².", category: "tiles", price: 4500, quantity: 4.3, unit: "м²", condition: "new", city: "Астана", d: 1 },
  { sellerId: "u-aidar", title: "Плитка настенная белая 20×30", description: "Аккуратно сняли со стены кухни. Около 6 м², на тыльной стороне остатки клея.", category: "tiles", price: 1500, quantity: 6, unit: "м²", condition: "good", city: "Алматы", d: 3,
    passport: { materialType: "Керамическая настенная плитка (глазурованная)", visualCondition: "Глазурь целая, на тыльной стороне остатки клея", visibleDefects: ["Остатки плиточного клея", "Единичные сколы по краю"], recoveryRecommendations: ["Замочить и счистить старый клей", "Отбраковать плитки со сколами"], reuseRecommendations: ["Фартук в санузле или на кухне", "Облицовка подсобных помещений", "Мозаика из обломков"], verificationStatus: "user_confirmed", createdAt: day(3) } },
  { sellerId: "u-ksenia", title: "Мозаика стеклянная голубая", description: "8 листов 30×30, новые. Не подошли по цвету.", category: "tiles", price: 1200, quantity: 8, unit: "шт", condition: "new", city: "Караганда", d: 10 },
  { sellerId: "u-marat", title: "Тротуарная плитка, б/у ~25 м²", description: "Демонтировали двор. Плитка «кирпичик», серая. Часть со сколами.", category: "tiles", price: 1800, quantity: 25, unit: "м²", condition: "fair", city: "Шымкент", d: 14 },

  // Двери и окна
  { sellerId: "u-dana", title: "Межкомнатная дверь массив, 80 см", description: "Сняли при перепланировке. С коробкой и наличниками. Есть потёртости лака.", category: "doors_windows", price: 25000, quantity: 1, unit: "шт", condition: "good", city: "Астана", d: 2 },
  { sellerId: "u-aidar", title: "Пластиковое окно 1300×1400", description: "Двухстворчатое, с подоконником. Демонтировали при остеклении лоджии. Стеклопакет целый.", category: "doors_windows", price: 30000, quantity: 1, unit: "шт", condition: "good", city: "Алматы", d: 8 },
  { sellerId: "u-brigada", title: "Деревянные рамы старые, 4 шт", description: "Старые советские рамы со стёклами. Подойдут для теплицы или декора.", category: "doors_windows", price: 0, quantity: 4, unit: "шт", condition: "needs_repair", city: "Алматы", d: 11 },

  // Сантехника
  { sellerId: "u-dana", title: "Раковина керамическая с пьедесталом", description: "Белая, без сколов. Демонтировали при замене на тумбу. Смеситель не входит.", category: "plumbing", price: 8000, quantity: 1, unit: "шт", condition: "excellent", city: "Астана", d: 1,
    passport: { materialType: "Санфаянсовая раковина с пьедесталом", visualCondition: "Глазурь целая, сколов и трещин не видно", visibleDefects: ["Известковый налёт у сливного отверстия"], recoveryRecommendations: ["Удалить налёт средством с кислотой", "Заменить сифон и прокладки"], reuseRecommendations: ["Санузел в квартире или на даче", "Гостевой туалет"], verificationStatus: "user_confirmed", createdAt: day(1) } },
  { sellerId: "u-ksenia", title: "Ванна чугунная 170 см", description: "Старая, тяжёлая, эмаль местами потёрта. Можно отреставрировать вкладышем или наливом.", category: "plumbing", price: 10000, quantity: 1, unit: "шт", condition: "needs_repair", city: "Караганда", d: 6 },
  { sellerId: "u-marat", title: "Полипропиленовые трубы 20 мм", description: "Остаток после разводки: около 30 м плюс пакет фитингов.", category: "plumbing", price: 150, quantity: 30, unit: "м", condition: "new", city: "Шымкент", d: 13 },
  { sellerId: "u-aidar", title: "Смеситель для кухни, хром", description: "Рабочий, снят из-за смены дизайна. Картридж поменян полгода назад.", category: "plumbing", price: 6000, quantity: 1, unit: "шт", condition: "good", city: "Алматы", d: 4 },

  // Электрика
  { sellerId: "u-brigada", title: "Кабель ВВГнг 3×2,5, остатки", description: "Бухта неполная, около 45 м. Новый.", category: "electrical", price: 380, quantity: 45, unit: "м", condition: "new", city: "Алматы", d: 2 },
  { sellerId: "u-dana", title: "Розетки и выключатели Legrand, 12 шт", description: "Белые, сняты при замене на чёрные. Все рабочие.", category: "electrical", price: 700, quantity: 12, unit: "шт", condition: "good", city: "Астана", d: 9 },

  // Кровля
  { sellerId: "u-marat", title: "Профнастил С8, б/у, 20 листов", description: "Снят со старого навеса, 2 м × 1,2 м. Есть отверстия от саморезов.", category: "roofing", price: 2500, quantity: 20, unit: "шт", condition: "fair", city: "Шымкент", d: 5 },
  { sellerId: "u-ksenia", title: "Мягкая черепица, 3 упаковки", description: "Осталась после кровли беседки. Цвет коричневый.", category: "roofing", price: 7000, quantity: 3, unit: "упак.", condition: "new", city: "Караганда", d: 16 },

  // Отделка
  { sellerId: "u-aidar", title: "Ламинат 32 класс, дуб, 7 м²", description: "Остаток после ремонта, 3 пачки, одна вскрыта.", category: "finishing", price: 2800, quantity: 7, unit: "м²", condition: "new", city: "Алматы", d: 1 },
  { sellerId: "u-dana", title: "Гипсокартон влагостойкий, 6 листов", description: "Обрезки и целые листы. Подходит для ванной.", category: "finishing", price: 1500, quantity: 6, unit: "шт", condition: "good", city: "Астана", d: 7 },
  { sellerId: "u-brigada", title: "Декоративная штукатурка, 2 ведра", description: "Остаток, срок годности до следующего года. Белая, под колеровку.", category: "finishing", price: 8000, quantity: 2, unit: "шт", condition: "new", city: "Алматы", d: 12 },

  // Другое
  { sellerId: "u-marat", title: "Поддоны деревянные, 15 шт", description: "Европоддоны после доставки блоков. Годятся для мебели в стиле лофт или на дрова.", category: "other", price: 1000, quantity: 15, unit: "шт", condition: "good", city: "Шымкент", d: 3 },
  { sellerId: "u-ksenia", title: "Утеплитель минвата, 2 упаковки", description: "Остаток после утепления мансарды, 50 мм.", category: "other", price: 6000, quantity: 2, unit: "упак.", condition: "new", city: "Караганда", d: 8 },
];

/**
 * Фото с Unsplash (бесплатная лицензия Unsplash, хотлинк разрешён правилами Unsplash).
 * Порядок совпадает с порядком объявлений выше; null — фото нет, показывается заглушка категории.
 */
const PHOTOS: (string | null)[] = [
  "1629608564457-5d74829a9e14",
  "1641375863453-238c8b00b867",
  "1650460533962-601b36580ef4",
  "1559322575-2f4e66131d55",
  "1422246654994-34520d5a0340",
  "1761053130711-2515ef532bb5",
  "1634672652995-ee7525bce595",
  "1597113366853-fea190b6cd82",
  "1721622045835-51a5447f281c",
  "1745909247906-123b53b70e06",
  "1549030782-4935f80baeb6",
  "1534503442463-e0ddba45cf4c",
  "1781445781804-dff17e05bd53",
  "1644056368311-c8054df845d0",
  "1603621713988-693d692937fd",
  "1490717164730-d639c415a82a",
  "1695928668952-c3c01a638e1d",
  "1587729042088-a8034bffd61a",
  "1771681744660-d3ff70bc24a2",
  "1507652313519-d4e9174996dd",
  "1545193329-4a052e14eb8f",
  "1629078692818-c5a0443f4ae3",
  "1518181835702-6eef8b4b2113",
  "1484024091473-858a1e7ece52",
  "1770085057307-c9a38bb834e0",
  "1710139323182-69622cad5c3b",
  "1575204015311-0fe377370780",
  "1770838773417-08b18661c62f",
  "1623835255306-868c63d9335e",
  "1573209680076-bd7ec7007616",
  null
];

const photoUrl = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=75&auto=format&fit=crop`;

export const SEED_LISTINGS: Listing[] = raw.map(({ d, images, ...l }, i) => ({
  ...l,
  id: `seed-${i + 1}`,
  status: "active",
  images: images ?? (PHOTOS[i] ? [photoUrl(PHOTOS[i]!)] : []),
  createdAt: day(d),
  updatedAt: day(d),
}));
