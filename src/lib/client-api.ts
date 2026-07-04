// Thin client-side fetch helpers for the JSON API. Throw on non-2xx with the server message.

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export type TxInput = {
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
  date?: string;
  note?: string | null;
};

export const api = {
  createTransaction: (body: TxInput) =>
    req("/api/transactions", { method: "POST", body: JSON.stringify(body) }),
  updateTransaction: (id: string, body: Partial<TxInput>) =>
    req(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTransaction: (id: string) =>
    req(`/api/transactions/${id}`, { method: "DELETE" }),
  createCategory: (body: { name: string; color?: string; icon?: string }) =>
    req("/api/categories", { method: "POST", body: JSON.stringify(body) }),
  deleteCategory: (id: string) =>
    req(`/api/categories/${id}`, { method: "DELETE" }),
  updateUser: (body: Record<string, unknown>) =>
    req("/api/user", { method: "PATCH", body: JSON.stringify(body) }),
};
