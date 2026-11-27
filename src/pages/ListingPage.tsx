import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, MessageCircle, Calendar, Pencil, Trash2, PackageX, User } from "lucide-react";
import * as api from "@/lib/api";
import { categoryName, conditionName, formatDate, formatPrice } from "@/lib/constants";
import type { ListingWithSeller } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Spinner, cn } from "@/components/ui";
import { FavoriteButton, ListingImage, PassportView } from "@/components/listing";

export default function ListingPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [l, setL] = useState<ListingWithSeller | null | undefined>(undefined);
  const [fav, setFav] = useState<string[]>([]);
  const [img, setImg] = useState(0);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    api.getListing(id!).then(setL);
    api.favoriteIds().then(setFav);
  }, [id, user]);

  if (l === undefined) return <Spinner />;
  if (l === null)
    return (
      <div className="container-page py-16">
        <EmptyState icon={<PackageX className="h-6 w-6" />} title="Объявление не найдено" text="Возможно, его удалили." action={<Button onClick={() => nav("/catalog")}>В каталог</Button>} />
      </div>
    );

  const mine = user?.id === l.sellerId;
  const phoneDigits = l.seller.phone.replace(/\D/g, "");

  return (
    <div className="container-page py-8">
      <button onClick={() => nav(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white">
            <ListingImage listing={l} index={img} large />
            <FavoriteButton listingId={l.id} initial={fav.includes(l.id)} className="absolute right-4 top-4 h-11 w-11" />
          </div>
          {l.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {l.images.map((src, i) => (
                <button key={i} onClick={() => setImg(i)} className={cn("h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2", i === img ? "border-primary" : "border-transparent opacity-70")}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-semibold">Описание</h2>
            <p className="whitespace-pre-line text-ink/90">{l.description || "Продавец не добавил описание."}</p>
          </div>

          {l.passport ? (
            <PassportView passport={l.passport} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-muted">
              У этого объявления пока нет цифрового паспорта.
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{categoryName(l.category)}</Badge>
              {l.status === "sold" && <Badge tone="red">Продано</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight">{l.title}</h1>
            <p className="mt-3 text-3xl font-bold text-primary">
              {formatPrice(l.price)}
              {l.price > 0 && <span className="text-base font-normal text-ink-muted"> / {l.unit}</span>}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-ink-muted">Количество</dt>
              <dd className="font-medium">{l.quantity.toLocaleString("ru-RU")} {l.unit}</dd>
              <dt className="text-ink-muted">Состояние</dt>
              <dd className="font-medium">{conditionName(l.condition)}</dd>
              <dt className="text-ink-muted">Город</dt>
              <dd className="flex items-center gap-1 font-medium"><MapPin className="h-3.5 w-3.5" />{l.city}</dd>
              <dt className="text-ink-muted">Размещено</dt>
              <dd className="flex items-center gap-1 font-medium"><Calendar className="h-3.5 w-3.5" />{formatDate(l.createdAt)}</dd>
            </dl>

            {mine ? (
              <div className="mt-6 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => nav(`/listing/${l.id}/edit`)}><Pencil className="h-4 w-4" /> Редактировать</Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!confirm("Удалить объявление?")) return;
                    await api.deleteListing(l.id);
                    nav("/account");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : showPhone ? (
              <div className="mt-6 space-y-2">
                <a href={`tel:+${phoneDigits}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white">
                  <Phone className="h-4 w-4" /> {l.seller.phone}
                </a>
                <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Здравствуйте! Пишу по объявлению на QaitaBuild: «${l.title}»`)}`} target="_blank" rel="noreferrer"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366]/10 font-semibold text-[#128C7E]">
                  <MessageCircle className="h-4 w-4" /> Написать в WhatsApp
                </a>
              </div>
            ) : (
              <Button size="lg" className="mt-6 w-full" onClick={() => setShowPhone(true)}>
                <Phone className="h-4 w-4" /> Связаться с продавцом
              </Button>
            )}
          </Card>

          <Card className="flex items-center gap-3 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-sage-light text-primary"><User className="h-5 w-5" /></div>
            <div>
              <p className="font-medium">{l.seller.fullName}</p>
              <p className="text-sm text-ink-muted">{l.seller.city}</p>
            </div>
          </Card>

          <p className="px-1 text-xs text-ink-muted">
            Осматривайте материал при встрече. Не переводите предоплату незнакомым продавцам.{" "}
            <Link to="/catalog" className="text-primary hover:underline">Похожие объявления</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
