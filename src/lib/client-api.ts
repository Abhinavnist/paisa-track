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

export type NoteContent = Record<string, unknown>;

export type NoteUpdateInput = {
  title?: string;
  content?: NoteContent;
  folderId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  tagIds?: string[];
};

// Notes feature endpoints.
export const notesApi = {
  list: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req<{ notes: NoteListItem[] }>(`/api/notes${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => req<{ note: NoteDetail; role: string; isOwner: boolean }>(`/api/notes/${id}`),
  create: (body: { title?: string; content?: NoteContent; folderId?: string | null } = {}) =>
    req<{ note: { id: string } }>("/api/notes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: NoteUpdateInput) =>
    req(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => req(`/api/notes/${id}`, { method: "DELETE" }),
  restore: (id: string) => req(`/api/notes/${id}/restore`, { method: "POST" }),

  // Folders
  listFolders: () => req<{ folders: NoteFolderItem[] }>("/api/notes/folders"),
  createFolder: (name: string) =>
    req("/api/notes/folders", { method: "POST", body: JSON.stringify({ name }) }),
  renameFolder: (id: string, name: string) =>
    req(`/api/notes/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteFolder: (id: string) => req(`/api/notes/folders/${id}`, { method: "DELETE" }),

  // Tags
  listTags: () => req<{ tags: NoteTagItem[] }>("/api/notes/tags"),
  createTag: (name: string, color?: string) =>
    req("/api/notes/tags", { method: "POST", body: JSON.stringify({ name, color }) }),
  deleteTag: (id: string) => req(`/api/notes/tags/${id}`, { method: "DELETE" }),

  // Sharing — collaborators
  addCollaborator: (noteId: string, body: { email?: string; friendId?: string; role: "VIEWER" | "EDITOR" }) =>
    req(`/api/notes/${noteId}/collaborators`, { method: "POST", body: JSON.stringify(body) }),
  updateCollaborator: (noteId: string, cid: string, role: "VIEWER" | "EDITOR") =>
    req(`/api/notes/${noteId}/collaborators/${cid}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeCollaborator: (noteId: string, cid: string) =>
    req(`/api/notes/${noteId}/collaborators/${cid}`, { method: "DELETE" }),

  // Sharing — public link
  enablePublic: (noteId: string) =>
    req<{ note: PublicState }>(`/api/notes/${noteId}/share/public`, { method: "POST" }),
  disablePublic: (noteId: string) =>
    req<{ note: PublicState }>(`/api/notes/${noteId}/share/public`, { method: "DELETE" }),
  rotatePublic: (noteId: string) =>
    req<{ note: PublicState }>(`/api/notes/${noteId}/share/public/rotate`, { method: "POST" }),

  // Invites
  listInvites: () => req<{ invites: NoteInvite[] }>("/api/notes/invites"),
  respondInvite: (id: string, action: "accept" | "decline") =>
    req(`/api/notes/invites/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
};

export type NoteTagItem = { id: string; name: string; color: string | null };
export type NoteFolderItem = { id: string; name: string; count: number };
export type NoteListItem = {
  id: string;
  title: string;
  excerpt: string;
  isPinned: boolean;
  isArchived: boolean;
  isPublic: boolean;
  updatedAt: string;
  folder: { id: string; name: string } | null;
  tags: NoteTagItem[];
  isShared: boolean;
  isOwner: boolean;
};
export type NoteCollaboratorItem = {
  id: string;
  email: string;
  role: "VIEWER" | "EDITOR";
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  userId: string | null;
};
export type NoteDetail = {
  id: string;
  title: string;
  content: NoteContent;
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isPublic: boolean;
  publicToken: string | null;
  updatedAt: string;
  tags: NoteTagItem[];
  collaborators: NoteCollaboratorItem[];
};
export type PublicState = { id: string; isPublic: boolean; publicToken: string | null };
export type NoteInvite = {
  id: string;
  role: "VIEWER" | "EDITOR";
  note: { id: string; title: string; owner: { name: string | null; email: string } };
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
