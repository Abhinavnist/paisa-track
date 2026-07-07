import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generateHTML } from "@tiptap/html";
import { getPublicNote } from "@/lib/notes";
import { noteExtensions } from "@/lib/tiptap-extensions";

// Public, unauthenticated read-only view of a shared note. Not under the (app)
// route group, and "/share" is intentionally excluded from PROTECTED_PREFIXES,
// so no session is required. getPublicNote only returns notes with sharing on.

export const metadata: Metadata = { title: "Shared note" };

export default async function SharedNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const note = await getPublicNote(token);
  if (!note) notFound();

  let html = "";
  try {
    html = generateHTML(note.content as Record<string, unknown>, noteExtensions);
  } catch {
    html = "";
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10">
      <article>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
          {note.title || "Untitled"}
        </h1>
        <p className="mb-8 text-sm text-slate-400">
          {note.owner.name ? `Shared by ${note.owner.name}` : "Shared note"} · read-only
        </p>
        {html ? (
          <div
            className="tiptap prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-slate-400">This note is empty.</p>
        )}
      </article>
      <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-400 dark:border-slate-700">
        Made with PaisaTrack
      </footer>
    </main>
  );
}
