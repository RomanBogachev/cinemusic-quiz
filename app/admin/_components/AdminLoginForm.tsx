"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminLoginFormProps = {
  setupMode?: boolean;
};

export function AdminLoginForm({ setupMode = false }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch(setupMode ? "/api/admin/setup" : "/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось войти");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="apple-card mx-auto mt-20 max-w-md p-7">
      <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">
        {setupMode ? "Создание администратора" : "Вход в админку"}
      </h1>
      <p className="mt-3 text-muted">
        {setupMode
          ? "Создайте первого администратора. Пароль будет сохранён в базе как bcrypt hash."
          : "Введите email и пароль администратора."}
      </p>
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-muted">Email</span>
        <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus required />
      </label>
      {setupMode && (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-muted">Имя</span>
          <input className="input" type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      )}
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-muted">Пароль</span>
        <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button className="btn btn-primary mt-6 w-full" type="submit" disabled={loading}>
        {loading ? "Проверяю..." : setupMode ? "Создать и войти" : "Войти"}
      </button>
    </form>
  );
}
