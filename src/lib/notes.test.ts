import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPlainText, excerpt, roleSatisfies } from "./notes";

// A representative TipTap document: heading, paragraph with a link mark, a task
// list with checkboxes, and a code block.
const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Trip to Goa" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Budget " },
        { type: "text", marks: [{ type: "bold" }], text: "20000" },
        { type: "text", text: " see " },
        { type: "text", marks: [{ type: "link", attrs: { href: "https://x" } }], text: "flights" },
      ],
    },
    {
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Book hotel" }] }] },
        { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Split cab" }] }] },
      ],
    },
    { type: "codeBlock", content: [{ type: "text", text: "npm run dev" }] },
  ],
};

test("extractPlainText pulls all text nodes, space-separated", () => {
  const text = extractPlainText(doc);
  for (const word of ["Trip to Goa", "Budget", "20000", "flights", "Book hotel", "Split cab", "npm run dev"]) {
    assert.ok(text.includes(word), `expected "${word}" in: ${text}`);
  }
  // No raw newlines survive collapsing, and words from adjacent blocks stay separated.
  assert.ok(!text.includes("Goa Budget".replace(" ", "")), "blocks must not concatenate without a separator");
});

test("extractPlainText is safe on empty / malformed input", () => {
  assert.equal(extractPlainText({}), "");
  assert.equal(extractPlainText(null), "");
  assert.equal(extractPlainText({ type: "doc", content: [] }), "");
});

test("excerpt truncates with an ellipsis and trims", () => {
  assert.equal(excerpt("short note"), "short note");
  const long = "a".repeat(200);
  const out = excerpt(long, 160);
  assert.equal(out.length, 161); // 160 chars + ellipsis
  assert.ok(out.endsWith("…"));
});

test("roleSatisfies enforces OWNER > EDITOR > VIEWER", () => {
  // Viewer requirement
  assert.ok(roleSatisfies("VIEWER", "VIEWER"));
  assert.ok(roleSatisfies("EDITOR", "VIEWER"));
  assert.ok(roleSatisfies("OWNER", "VIEWER"));
  // Editor requirement
  assert.ok(!roleSatisfies("VIEWER", "EDITOR"));
  assert.ok(roleSatisfies("EDITOR", "EDITOR"));
  assert.ok(roleSatisfies("OWNER", "EDITOR"));
});
