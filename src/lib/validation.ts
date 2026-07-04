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

export type SignupInput = z.infer<typeof signupSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
