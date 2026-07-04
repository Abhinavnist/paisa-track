// Default expense categories seeded for every new user.
// `icon` values are lucide-react icon names; `color` is used for chart segments.

export type DefaultCategory = { name: string; icon: string; color: string };

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Food", icon: "Utensils", color: "#ef4444" },
  { name: "Rent", icon: "Home", color: "#8b5cf6" },
  { name: "Travel", icon: "Bus", color: "#3b82f6" },
  { name: "Bills", icon: "ReceiptText", color: "#f59e0b" },
  { name: "Shopping", icon: "ShoppingBag", color: "#ec4899" },
  { name: "Health", icon: "HeartPulse", color: "#10b981" },
  { name: "Entertainment", icon: "Clapperboard", color: "#06b6d4" },
  { name: "Other", icon: "Tag", color: "#64748b" },
];

// Seed default categories for a freshly created user (idempotent via skipDuplicates).
export async function seedCategoriesForUser(
  prisma: import("@/generated/prisma").PrismaClient,
  userId: string,
) {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true })),
    skipDuplicates: true,
  });
}
