// Single source of truth for the TipTap schema. Shared by the client editor
// (NoteEditor) and the server-side HTML render on the public /share page, so a
// note always serializes and renders with the exact same node/mark set.
//
// StarterKit v3 already bundles Bold/Italic/Strike/Code/CodeBlock/Blockquote/
// Heading/BulletList/OrderedList/ListItem/HardBreak/HorizontalRule/Link — do NOT
// re-register those or TipTap throws a duplicate-extension error. TaskList and
// TaskItem are not in StarterKit, so they're added here.

import { StarterKit } from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import type { Extensions } from "@tiptap/core";

export const noteExtensions: Extensions = [
  StarterKit.configure({
    link: {
      openOnClick: false, // don't navigate while editing
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
];

// An empty TipTap document — the default value for a new note.
export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
