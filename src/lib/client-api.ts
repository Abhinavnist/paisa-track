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

export type ParticipantInput = { userId: string; value?: number };

export type SharedExpenseInput = {
  groupId?: string | null;
  friendId?: string | null;
  amount: number;
  description: string;
  date?: string;
  paidById: string;
  splitType: "EQUAL" | "EXACT" | "PERCENT" | "SHARES";
  participants: ParticipantInput[];
};

export type SettlementInput = {
  groupId?: string | null;
  friendId?: string | null;
  fromId: string;
  toId: string;
  amount: number;
  note?: string | null;
  date?: string;
};

// Splitwise feature endpoints.
export const splits = {
  // Friends & invites
  inviteFriend: (email: string) =>
    req("/api/friends/invites", { method: "POST", body: JSON.stringify({ email }) }),
  respondFriendInvite: (id: string, action: "accept" | "decline") =>
    req(`/api/friends/invites/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
  cancelFriendInvite: (id: string) =>
    req(`/api/friends/invites/${id}`, { method: "DELETE" }),
  unfriend: (id: string, force = false) =>
    req(`/api/friends/${id}${force ? "?force=1" : ""}`, { method: "DELETE" }),

  // Groups & membership
  createGroup: (name: string) =>
    req("/api/groups", { method: "POST", body: JSON.stringify({ name }) }),
  renameGroup: (id: string, name: string) =>
    req(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteGroup: (id: string) => req(`/api/groups/${id}`, { method: "DELETE" }),
  inviteMember: (groupId: string, email: string) =>
    req(`/api/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ email }) }),
  removeMember: (groupId: string, memberId: string, force = false) =>
    req(`/api/groups/${groupId}/members/${memberId}${force ? "?force=1" : ""}`, { method: "DELETE" }),
  respondGroupInvite: (memberId: string, action: "accept" | "decline") =>
    req(`/api/groups/invites/${memberId}`, { method: "PATCH", body: JSON.stringify({ action }) }),

  // Shared expenses
  createExpense: (body: SharedExpenseInput) =>
    req("/api/expenses", { method: "POST", body: JSON.stringify(body) }),
  updateExpense: (id: string, body: SharedExpenseInput) =>
    req(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteExpense: (id: string) => req(`/api/expenses/${id}`, { method: "DELETE" }),

  // Settlements
  createSettlement: (body: SettlementInput) =>
    req("/api/settlements", { method: "POST", body: JSON.stringify(body) }),
  deleteSettlement: (id: string) => req(`/api/settlements/${id}`, { method: "DELETE" }),
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
