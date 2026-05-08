"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
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
      <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Вход в админку</h1>
      <p className="mt-3 text-muted">Введите пароль из переменной окружения ADMIN_PASSWORD.</p>
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-semibold text-muted">Пароль</span>
        <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <button className="btn btn-primary mt-6 w-full" type="submit" disabled={loading}>
        {loading ? "Проверяю..." : "Войти"}
      </button>
    </form>
  );
}
