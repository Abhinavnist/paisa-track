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

export type RecurringInput = {
  amount: number;
  type: "INCOME" | "EXPENSE";
  categoryId?: string | null;
  note?: string | null;
  frequency: "MONTHLY" | "WEEKLY";
  dayOfMonth?: number;
  weekday?: number;
  active?: boolean;
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
  updateCategory: (id: string, body: { name?: string; color?: string; monthlyBudget?: number }) =>
    req(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateUser: (body: Record<string, unknown>) =>
    req("/api/user", { method: "PATCH", body: JSON.stringify(body) }),
  createRecurring: (body: RecurringInput) =>
    req("/api/recurring", { method: "POST", body: JSON.stringify(body) }),
  updateRecurring: (id: string, body: Partial<RecurringInput>) =>
    req(`/api/recurring/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRecurring: (id: string) =>
    req(`/api/recurring/${id}`, { method: "DELETE" }),
};
