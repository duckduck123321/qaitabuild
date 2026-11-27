import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Plus, User, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isDemoMode, resetDemoData } from "@/lib/api";
import { Button, cn } from "./ui";

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className={cn("text-lg font-bold tracking-tight", light ? "text-white" : "text-primary")}>
        Qaita<span className={light ? "text-sage" : "text-ink"}>Build</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/catalog", label: "Каталог" },
  { to: "/ai", label: "AI-инструменты" },
  { to: "/ai/project-planner", label: "Подбор под проект" },
];

function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-lg px-3 py-2 text-sm font-medium transition", isActive ? "text-primary" : "text-ink-muted hover:text-ink");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end className={link}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button size="sm" onClick={() => nav(user ? "/listing/new" : "/login?next=/listing/new")}>
            <Plus className="h-4 w-4" /> Разместить
          </Button>
          {user ? (
            <Button size="sm" variant="outline" onClick={() => nav("/account")}>
              <User className="h-4 w-4" /> {user.fullName.split(" ")[0]}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => nav("/login")}>Войти</Button>
          )}
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg md:hidden" onClick={() => setOpen(!open)} aria-label="Меню">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white md:hidden" onClick={() => setOpen(false)}>
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end className={link}>{n.label}</NavLink>
            ))}
            <NavLink to={user ? "/account" : "/login"} className={link}>{user ? "Личный кабинет" : "Войти / Регистрация"}</NavLink>
            <Button className="mt-2" onClick={() => nav(user ? "/listing/new" : "/login?next=/listing/new")}>
              <Plus className="h-4 w-4" /> Разместить объявление
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-primary-dark text-white/70">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm">Вторая жизнь строительных материалов в Казахстане.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Маркетплейс</p>
          <Link to="/catalog" className="block hover:text-white">Каталог</Link>
          <Link to="/listing/new" className="block hover:text-white">Разместить объявление</Link>
          <Link to="/account" className="block hover:text-white">Личный кабинет</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-ai" />AI-инструменты</p>
          <Link to="/ai/project-planner" className="block hover:text-white">Подбор под проект</Link>
          <Link to="/ai/inspector" className="block hover:text-white">Анализ материала</Link>
          <Link to="/ai/recovery" className="block hover:text-white">Восстановление</Link>
          <Link to="/ai/pre-demolition" className="block hover:text-white">Перед демонтажем</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Контакты</p>
          <p>hello@qaitabuild.kz</p>
          <p>Алматы, Казахстан</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-4 text-xs">
          <p>© 2026 QaitaBuild · Учебный проект</p>
          {isDemoMode && <button
            className="underline-offset-2 hover:text-white hover:underline"
            onClick={() => {
              if (confirm("Сбросить демо-данные? Ваши объявления и аккаунты в этом браузере будут удалены.")) {
                resetDemoData();
                location.href = "/";
              }
            }}
          >
            Сбросить демо-данные
          </button>}
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
