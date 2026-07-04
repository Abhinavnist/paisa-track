import {
  Utensils,
  Home,
  Bus,
  ReceiptText,
  ShoppingBag,
  HeartPulse,
  Clapperboard,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Map of the icon names we seed for categories. Falls back to Tag.
const ICONS: Record<string, LucideIcon> = {
  Utensils,
  Home,
  Bus,
  ReceiptText,
  ShoppingBag,
  HeartPulse,
  Clapperboard,
  Tag,
  Wallet,
};

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || Tag;
  return <Icon className={className} />;
}
