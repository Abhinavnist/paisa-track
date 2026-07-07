"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, Link2, Undo2, Redo2,
} from "lucide-react";
import { noteExtensions } from "@/lib/tiptap-extensions";
import { cn } from "@/lib/utils";
import type { NoteContent } from "@/lib/client-api";

// The TipTap editor itself. Loaded client-only (ssr:false) by NoteWorkspace so
// it never prerenders on the server. `immediatelyRender: false` is required for
// SSR-safety in Next.js even behind dynamic import.
export default function NoteEditor({
  initialContent,
  editable,
  onChange,
}: {
  initialContent: NoteContent;
  editable: boolean;
  onChange?: (content: NoteContent) => void;
}) {
  const editor = useEditor({
    extensions: [
      ...noteExtensions,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-slate dark:prose-invert max-w-none min-h-[50vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON() as NoteContent),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return (
    <div>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-lg transition",
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
    );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white/95 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <button className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("taskList"))} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist"><ListChecks className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block"><Code className="h-4 w-4" /></button>
      <button className={btn(editor.isActive("link"))} onClick={setLink} title="Link"><Link2 className="h-4 w-4" /></button>
      <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button className={btn(false)} onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo2 className="h-4 w-4" /></button>
      <button className={btn(false)} onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo2 className="h-4 w-4" /></button>
    </div>
  );
}
