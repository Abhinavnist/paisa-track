import { z } from "zod";
import { CURRENCIES } from "@/lib/currency";

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  currency: z.enum(currencyCodes),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  categoryId: z.string().optional().nullable(),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(200).optional().nullable(),
});

export const updateTransactionSchema = transactionSchema.partial();

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.string().trim().max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #64748b")
    .optional(),
  monthlyBudget: z.coerce.number().min(0).optional(),
});

export const recurringSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  categoryId: z.string().optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
  frequency: z.enum(["MONTHLY", "WEEKLY"]).default("MONTHLY"),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  active: z.boolean().optional(),
});

export const updateRecurringSchema = recurringSchema.partial();

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  currency: z.enum(currencyCodes).optional(),
  monthlySalary: z.coerce.number().min(0).optional(),
  monthlyBudget: z.coerce.number().min(0).optional(),
  salaryCreditDay: z.coerce.number().int().min(1).max(28).optional(),
});

// ---- Splitwise feature ----

export const inviteEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(60),
});

const participantSchema = z.object({
  userId: z.string().min(1),
  value: z.coerce.number().optional(), // exact amount, percent, or share weight
});

export const sharedExpenseSchema = z
  .object({
    groupId: z.string().optional().nullable(),
    friendId: z.string().optional().nullable(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    description: z.string().trim().min(1, "Description is required").max(120),
    date: z.coerce.date().optional(),
    paidById: z.string().min(1),
    splitType: z.enum(["EQUAL", "EXACT", "PERCENT", "SHARES"]).default("EQUAL"),
    participants: z.array(participantSchema).min(1, "Add at least one participant"),
  })
  .refine((d) => !!d.groupId !== !!d.friendId, {
    message: "Provide either a group or a friend, not both",
    path: ["groupId"],
  })
  .refine(
    (d) =>
      d.splitType !== "EXACT" ||
      Math.round(d.participants.reduce((s, p) => s + (p.value ?? 0), 0) * 100) ===
        Math.round(d.amount * 100),
    { message: "Exact amounts must add up to the total", path: ["participants"] },
  )
  .refine(
    (d) =>
      d.splitType !== "PERCENT" ||
      Math.abs(d.participants.reduce((s, p) => s + (p.value ?? 0), 0) - 100) < 0.01,
    { message: "Percentages must add up to 100", path: ["participants"] },
  )
  .refine(
    (d) => d.splitType !== "SHARES" || d.participants.every((p) => (p.value ?? 0) > 0),
    { message: "Every share must be greater than 0", path: ["participants"] },
  )
  .refine((d) => new Set(d.participants.map((p) => p.userId)).size === d.participants.length, {
    message: "Duplicate participant",
    path: ["participants"],
  });

export const settlementSchema = z
  .object({
    groupId: z.string().optional().nullable(),
    friendId: z.string().optional().nullable(),
    fromId: z.string().min(1),
    toId: z.string().min(1),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    note: z.string().trim().max(120).optional().nullable(),
    date: z.coerce.date().optional(),
  })
  .refine((d) => !!d.groupId !== !!d.friendId, {
    message: "Provide either a group or a friend",
    path: ["groupId"],
  })
  .refine((d) => d.fromId !== d.toId, { message: "Cannot settle with yourself", path: ["toId"] });

export type SignupInput = z.infer<typeof signupSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type SharedExpenseInput = z.infer<typeof sharedExpenseSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
