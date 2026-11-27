import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import * as api from "@/lib/api";
import { CITIES } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { Logo } from "@/components/Layout";

function Shell({ title, sub, children }: { title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{sub}</p>
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return msg ? <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{msg}</p> : null;
}

export function Login() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await api.login(email, password);
      await refresh();
      nav(next, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Вход" sub={<>Нет аккаунта? <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">Зарегистрироваться</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label className="block"><Label>Пароль</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <ErrorBox msg={err} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Войти</Button>
        <p className="text-center text-xs text-ink-muted">Восстановление пароля появится после подключения Supabase.</p>
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/account";
  const [f, setF] = useState({ fullName: "", email: "", password: "", city: "Алматы", phone: "+7 " });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const upd = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (f.password.length < 6) return setErr("Пароль должен быть не короче 6 символов");
    if (f.phone.replace(/\D/g, "").length < 11) return setErr("Укажите телефон полностью — по нему с вами свяжутся покупатели");
    setBusy(true);
    try {
      await api.register(f);
      await refresh();
      nav(next, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Регистрация" sub={<>Уже есть аккаунт? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">Войти</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><Label required>Имя</Label><Input required value={f.fullName} onChange={upd("fullName")} placeholder="Как к вам обращаться" /></label>
        <label className="block"><Label required>Email</Label><Input type="email" required value={f.email} onChange={upd("email")} autoComplete="email" /></label>
        <label className="block"><Label required hint="мин. 6 символов">Пароль</Label><Input type="password" required value={f.password} onChange={upd("password")} autoComplete="new-password" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><Label required>Город</Label><Select value={f.city} onChange={upd("city")}>{CITIES.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="block"><Label required>Телефон</Label><Input type="tel" required value={f.phone} onChange={upd("phone")} /></label>
        </div>
        <ErrorBox msg={err} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Создать аккаунт</Button>
      </form>
    </Shell>
  );
}
