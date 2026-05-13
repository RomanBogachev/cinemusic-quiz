"use client";

import { useEffect, useState } from "react";

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UsersPayload = {
  users: AdminUserRow[];
  currentUserId: string | null;
};

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordByUser, setPasswordByUser] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as UsersPayload;
    setUsers(payload.users);
    setCurrentUserId(payload.currentUserId);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password })
    });
    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать пользователя");
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setMessage("Администратор создан");
    await loadUsers();
  }

  async function updateUser(id: string, payload: { password?: string; isActive?: boolean }) {
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Не удалось обновить пользователя");
      return;
    }
    setPasswordByUser((current) => ({ ...current, [id]: "" }));
    setMessage("Пользователь обновлён");
    await loadUsers();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <section className="apple-card p-5 md:p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground">Администраторы</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-black/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3">Пользователь</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Смена пароля</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{user.name || "Без имени"}</div>
                    <div className="text-xs text-muted">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}`}>
                      {user.isActive ? "Активен" : "Отключён"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[220px] gap-2">
                      <input
                        className="input h-9 text-sm"
                        type="password"
                        minLength={8}
                        placeholder="Новый пароль"
                        value={passwordByUser[user.id] ?? ""}
                        onChange={(event) => setPasswordByUser((current) => ({ ...current, [user.id]: event.target.value }))}
                      />
                      <button
                        className="btn btn-ghost h-9 px-3 text-xs"
                        type="button"
                        onClick={() => updateUser(user.id, { password: passwordByUser[user.id] ?? "" })}
                        disabled={!passwordByUser[user.id]}
                      >
                        Сменить
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className={`btn h-9 px-3 text-xs ${user.isActive ? "btn-ghost text-rose-700" : "btn-ghost text-emerald-700"}`}
                      type="button"
                      disabled={user.id === currentUserId && user.isActive}
                      onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                    >
                      {user.isActive ? "Отключить" : "Включить"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={createUser} className="apple-card p-5 md:p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground">Добавить администратора</h2>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-muted">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-muted">Имя</span>
          <input className="input" type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-muted">Пароль</span>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
        <button className="btn btn-primary mt-5 w-full" type="submit" disabled={loading}>
          {loading ? "Создаю..." : "Добавить"}
        </button>
      </form>
    </div>
  );
}
