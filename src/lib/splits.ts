// Pure split-math core for the Splitwise feature. No prisma / IO imports so it
// stays trivially unit-testable. All money math happens in integer minor units
// (paise/cents) to avoid float drift; callers convert at the boundary.

export type SplitType = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

export type Participant = {
  userId: string;
  // For EXACT: the exact major-unit amount this user owes.
  // For PERCENT: the percentage (0-100).
  // For SHARES: the relative weight (>0).
  // Ignored for EQUAL.
  value?: number;
};

// Convert between major units (e.g. rupees) and integer minor units (paise).
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

export function toMajor(minor: number): number {
  return minor / 100;
}

// Deterministically sort two ids so a Friendship pair is stored/looked-up the
// same way regardless of direction. Returns [smaller, larger].
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Compute each participant's owed share in minor units. Guarantees the returned
// values sum EXACTLY to totalMinor (any rounding remainder is distributed
// deterministically). Throws on inputs the API should have already rejected.
export function computeShares(
  totalMinor: number,
  splitType: SplitType,
  participants: Participant[],
): Map<string, number> {
  if (participants.length === 0) throw new Error("No participants");
  const n = participants.length;
  const result = new Map<string, number>();

  if (splitType === "EQUAL") {
    const base = Math.floor(totalMinor / n);
    let remainder = totalMinor - base * n; // 0..n-1
    for (const p of participants) {
      result.set(p.userId, base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder--;
    }
    return result;
  }

  if (splitType === "EXACT") {
    // Each value is an exact major amount. API validates they sum to total.
    for (const p of participants) result.set(p.userId, toMinor(p.value ?? 0));
    return result;
  }

  // PERCENT and SHARES both distribute the total proportionally with a
  // largest-remainder (Hamilton) pass so the parts sum exactly to the total.
  const weights = participants.map((p) => p.value ?? 0);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) throw new Error("Total weight must be greater than 0");

  const exact = participants.map((p, i) => (totalMinor * weights[i]) / totalWeight);
  const floored = exact.map((x) => Math.floor(x));
  let distributed = floored.reduce((s, x) => s + x, 0);
  let leftover = totalMinor - distributed; // number of +1 minor units to hand out

  // Rank by largest fractional part; hand the leftover minor units to those first.
  const order = participants
    .map((_, i) => i)
    .sort((a, b) => exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])));

  const owed = [...floored];
  for (const idx of order) {
    if (leftover <= 0) break;
    owed[idx] += 1;
    leftover--;
  }

  participants.forEach((p, i) => result.set(p.userId, owed[i]));
  return result;
}

// A flat ledger of persisted shares + settlements, in minor units.
export type Ledger = {
  shares: { paidById: string; userId: string; owedMinor: number }[];
  settlements: { fromId: string; toId: string; amountMinor: number }[];
};

// Net position per user in minor units. Positive => they are owed money;
// negative => they owe. Invariant: the values sum to 0.
export function netBalances(ledger: Ledger): Map<string, number> {
  const net = new Map<string, number>();
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta);

  for (const s of ledger.shares) {
    if (s.userId === s.paidById) continue; // payer's own share nets to zero
    add(s.paidById, s.owedMinor);
    add(s.userId, -s.owedMinor);
  }
  // Paying down a debt moves the payer's net up toward zero.
  for (const s of ledger.settlements) {
    add(s.fromId, s.amountMinor);
    add(s.toId, -s.amountMinor);
  }
  return net;
}

// Greedy debt simplification: match biggest creditor against biggest debtor.
// Returns the minimal-ish set of "from owes to" transfers, in minor units.
export function pairwiseBalances(
  ledger: Ledger,
): { fromId: string; toId: string; amountMinor: number }[] {
  const net = netBalances(ledger);
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];
  for (const [id, amt] of net) {
    if (amt > 0) creditors.push({ id, amt });
    else if (amt < 0) debtors.push({ id, amt: -amt });
  }
  // Stable ordering (largest first) keeps output deterministic.
  creditors.sort((a, b) => b.amt - a.amt || (a.id < b.id ? -1 : 1));
  debtors.sort((a, b) => b.amt - a.amt || (a.id < b.id ? -1 : 1));

  const transfers: { fromId: string; toId: string; amountMinor: number }[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const give = Math.min(creditors[ci].amt, debtors[di].amt);
    transfers.push({ fromId: debtors[di].id, toId: creditors[ci].id, amountMinor: give });
    creditors[ci].amt -= give;
    debtors[di].amt -= give;
    if (creditors[ci].amt === 0) ci++;
    if (debtors[di].amt === 0) di++;
  }
  return transfers;
}
