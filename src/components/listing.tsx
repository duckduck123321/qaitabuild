import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BrickWall, TreePine, Wrench, Grid3x3, DoorOpen, ShowerHead, Zap, House, PaintRoller, Package, Heart, MapPin, Sparkles, BadgeCheck, Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { categoryName, conditionName, formatPrice } from "@/lib/constants";
import type { Listing, ListingWithSeller, Passport } from "@/lib/types";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, cn } from "./ui";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  bricks_blocks: BrickWall,
  wood_lumber: TreePine,
  metal: Wrench,
  tiles: Grid3x3,
  doors_windows: DoorOpen,
  plumbing: ShowerHead,
  electrical: Zap,
  roofing: House,
  finishing: PaintRoller,
  other: Package,
};

const TINTS: Record<string, string> = {
  bricks_blocks: "from-[#E9D6CB] to-[#D8B8A6] text-[#8A4B32]",
  wood_lumber: "from-[#EADFC8] to-[#D6C29B] text-[#7A5A24]",
  metal: "from-[#DDE2E4] to-[#BFC8CC] text-[#4B5A60]",
  tiles: "from-[#DCE6EA] to-[#BDD0D8] text-[#3D6371]",
  doors_windows: "from-[#E6E1D8] to-[#CFC6B6] text-[#6B5D45]",
  plumbing: "from-[#DAE7EE] to-[#B8D2E0] text-[#2F5D78]",
  electrical: "from-[#F1E8CF] to-[#E2D3A4] text-[#80661C]",
  roofing: "from-[#E3DAD6] to-[#C9B8B0] text-[#6E4A3D]",
  finishing: "from-[#E4E8DD] to-[#C9D3BC] text-[#4F6340]",
  other: "from-[#DCE9D8] to-[#BFD4B8] text-[#244D3C]",
};

/** Фото объявления или аккуратная заглушка категории, если фото нет. */
export function ListingImage({ listing, className, index = 0, large = false }: { listing: Pick<Listing, "images" | "category" | "title">; className?: string; index?: number; large?: boolean }) {
  const raw = listing.images[index];
  // Для карточек берём у Unsplash уменьшенную копию — каталог грузится быстрее
  const src = raw && !large && raw.includes("images.unsplash.com") ? raw.replace(/([?&])w=\d+/, "$1w=560") : raw;
  if (src) return <img src={src} alt={listing.title} className={cn("h-full w-full object-cover", className)} loading="lazy" />;
  const Icon = CATEGORY_ICONS[listing.category] ?? Package;
  return (
    <div className={cn("grid h-full w-full place-items-center bg-gradient-to-br", TINTS[listing.category] ?? TINTS.other, className)}>
      <Icon className="h-10 w-10 opacity-70" strokeWidth={1.5} />
    </div>
  );
}

export function FavoriteButton({ listingId, initial, onChange, className }: { listingId: string; initial: boolean; onChange?: (v: boolean) => void; className?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={fav ? "Убрать из избранного" : "В избранное"}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return nav(`/login?next=/listing/${listingId}`);
        setBusy(true);
        const v = await api.toggleFavorite(listingId);
        setFav(v);
        onChange?.(v);
        setBusy(false);
      }}
      className={cn("grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105", className)}
    >
      <Heart className={cn("h-[18px] w-[18px]", fav ? "fill-red-500 text-red-500" : "text-ink-muted")} />
    </button>
  );
}

export function ListingCard({ listing, isFav }: { listing: ListingWithSeller; isFav: boolean }) {
  return (
    <Link to={`/listing/${listing.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ListingImage listing={listing} className="transition duration-300 group-hover:scale-[1.03]" />
        <FavoriteButton listingId={listing.id} initial={isFav} className="absolute right-3 top-3" />
        {listing.passport && (
          <Badge tone="ai" className="absolute left-3 top-3 shadow-sm">
            <Sparkles className="h-3 w-3" /> AI-паспорт
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-lg font-semibold">{formatPrice(listing.price)}<span className="text-sm font-normal text-ink-muted"> {listing.price > 0 && `/ ${listing.unit}`}</span></p>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</p>
        <p className="text-xs text-ink-muted">{categoryName(listing.category)} · {listing.quantity.toLocaleString("ru-RU")} {listing.unit}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{listing.city}</span>
          <span>{conditionName(listing.condition)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ items, favIds }: { items: ListingWithSeller[]; favIds: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((l) => (
        <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />
      ))}
    </div>
  );
}

/** Цифровой паспорт материала (AI-5) — с явной пометкой источника данных. */
export function PassportView({ passport }: { passport: Passport }) {
  const confirmed = passport.verificationStatus === "user_confirmed";
  const Section = ({ title, items }: { title: string; items: string[] }) =>
    items.length ? (
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</p>
        <ul className="space-y-1 text-sm">
          {items.map((t) => (
            <li key={t} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ai" />{t}</li>
          ))}
        </ul>
      </div>
    ) : null;
  return (
    <div className="rounded-2xl border border-ai/30 bg-ai-light/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-ai text-ink"><Sparkles className="h-4 w-4" /></div>
          <p className="font-semibold">Цифровой паспорт материала</p>
        </div>
        {confirmed ? (
          <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" /> Подтверждено продавцом</Badge>
        ) : (
          <Badge tone="ai"><Bot className="h-3.5 w-3.5" /> Предположение ИИ</Badge>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Тип материала</p>
          <p className="text-sm">{passport.materialType}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Визуальное состояние</p>
          <p className="text-sm">{passport.visualCondition}</p>
        </div>
        <Section title="Видимые дефекты" items={passport.visibleDefects} />
        <Section title="Как восстановить" items={passport.recoveryRecommendations} />
        <Section title="Где можно применить" items={passport.reuseRecommendations} />
      </div>
      <p className="mt-4 border-t border-ai/20 pt-3 text-xs text-ink-muted">
        Паспорт составлен по фото и не является сертификатом качества или безопасности. Перед использованием в ответственных конструкциях материал должен проверить специалист.
      </p>
    </div>
  );
}
