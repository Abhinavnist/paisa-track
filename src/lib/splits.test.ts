import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeShares,
  netBalances,
  pairwiseBalances,
  orderedPair,
  toMinor,
  type Ledger,
} from "./splits";

const sum = (m: Map<string, number>) => [...m.values()].reduce((s, x) => s + x, 0);

test("orderedPair sorts deterministically", () => {
  assert.deepEqual(orderedPair("b", "a"), ["a", "b"]);
  assert.deepEqual(orderedPair("a", "b"), ["a", "b"]);
});

test("EQUAL split divides evenly", () => {
  const shares = computeShares(toMinor(90), "EQUAL", [
    { userId: "a" },
    { userId: "b" },
    { userId: "c" },
  ]);
  assert.equal(shares.get("a"), 3000);
  assert.equal(shares.get("b"), 3000);
  assert.equal(shares.get("c"), 3000);
});

test("EQUAL split distributes an indivisible remainder (100/3)", () => {
  const total = toMinor(100);
  const shares = computeShares(total, "EQUAL", [
    { userId: "a" },
    { userId: "b" },
    { userId: "c" },
  ]);
  assert.equal(sum(shares), total); // exact
  // 10000 / 3 = 3334, 3333, 3333
  assert.equal(shares.get("a"), 3334);
  assert.equal(shares.get("b"), 3333);
  assert.equal(shares.get("c"), 3333);
});

test("EXACT split uses provided amounts", () => {
  const shares = computeShares(toMinor(100), "EXACT", [
    { userId: "a", value: 70 },
    { userId: "b", value: 30 },
  ]);
  assert.equal(shares.get("a"), 7000);
  assert.equal(shares.get("b"), 3000);
});

test("PERCENT split sums exactly even when rounding (33.33%/33.33%/33.34%)", () => {
  const total = toMinor(100);
  const shares = computeShares(total, "PERCENT", [
    { userId: "a", value: 33.33 },
    { userId: "b", value: 33.33 },
    { userId: "c", value: 33.34 },
  ]);
  assert.equal(sum(shares), total);
});

test("SHARES split distributes proportionally and sums exactly", () => {
  const total = toMinor(100);
  const shares = computeShares(total, "SHARES", [
    { userId: "a", value: 1 },
    { userId: "b", value: 1 },
    { userId: "c", value: 1 },
  ]);
  assert.equal(sum(shares), total);
  // weights equal -> same as EQUAL: 3334/3333/3333
  assert.equal(shares.get("a"), 3334);
});

test("netBalances: payer is owed, participants owe, sums to zero", () => {
  // a paid 90 split equally among a,b,c
  const ledger: Ledger = {
    shares: [
      { paidById: "a", userId: "a", owedMinor: 3000 },
      { paidById: "a", userId: "b", owedMinor: 3000 },
      { paidById: "a", userId: "c", owedMinor: 3000 },
    ],
    settlements: [],
  };
  const net = netBalances(ledger);
  assert.equal(net.get("a"), 6000); // owed by b and c
  assert.equal(net.get("b"), -3000);
  assert.equal(net.get("c"), -3000);
  assert.equal(sum(net), 0);
});

test("netBalances: a settlement moves balances toward zero", () => {
  const ledger: Ledger = {
    shares: [
      { paidById: "a", userId: "b", owedMinor: 3000 },
    ],
    settlements: [{ fromId: "b", toId: "a", amountMinor: 3000 }],
  };
  const net = netBalances(ledger);
  assert.equal(net.get("a"), 0);
  assert.equal(net.get("b"), 0);
});

test("pairwiseBalances simplifies a group's debts", () => {
  // a is owed 6000; b and c each owe 3000
  const ledger: Ledger = {
    shares: [
      { paidById: "a", userId: "b", owedMinor: 3000 },
      { paidById: "a", userId: "c", owedMinor: 3000 },
    ],
    settlements: [],
  };
  const transfers = pairwiseBalances(ledger);
  const total = transfers.reduce((s, t) => s + t.amountMinor, 0);
  assert.equal(total, 6000);
  assert.ok(transfers.every((t) => t.toId === "a"));
});
