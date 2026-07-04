// Shapes passed from server components to client components.

export type TxCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
} | null;

export type TxView = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string; // ISO
  note: string | null;
  source: "MANUAL" | "AUTO_SALARY" | "RECURRING";
  category: TxCategory;
};
