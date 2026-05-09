import { FormEvent, useEffect, useState } from "react";
import api from "../services/api";
import { Note } from "../types";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Note[]>("/notes")
      .then((r) => setNotes(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setSaving(true);
    try {
      const res = await api.post<Note>("/notes", { title: newTitle.trim(), content: newContent.trim() });
      setNotes((prev) => [res.data, ...prev]);
      setNewTitle("");
      setNewContent("");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  }

  async function handleSaveEdit(id: string) {
    try {
      const res = await api.patch<Note>(`/notes/${id}`, { title: editTitle.trim(), content: editContent.trim() });
      setNotes((prev) => prev.map((n) => (n.id === id ? res.data : n)));
      setEditingId(null);
    } catch {
      // silent
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setDeletingId(null);
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      {/* Delete confirm modal */}
      {deletingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete note?</h3>
            <p className="mt-2 text-sm text-slate-500">This will permanently delete this note.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deletingId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create note */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Notes</h2>
        <p className="mt-1 text-sm text-slate-500">Write quick notes, save ideas, meeting minutes, or links.</p>
        <form className="mt-5 space-y-3" onSubmit={handleCreate}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write your note here…"
            rows={4}
            className="w-full rounded border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none resize-y"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !newContent.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </section>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm italic text-slate-400">No notes yet. Create your first note above.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
              {editingId === note.id ? (
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={5}
                    className="w-full flex-1 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none resize-y"
                  />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleSaveEdit(note.id)} className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    {note.title ? (
                      <h3 className="text-sm font-semibold text-slate-800 leading-snug">{note.title}</h3>
                    ) : (
                      <span />
                    )}
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => startEdit(note)} title="Edit note" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.714 1.272l-.4 1.598a.75.75 0 0 0 .916.917l1.598-.4a2.75 2.75 0 0 0 1.272-.715l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                          <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeletingId(note.id)} title="Delete note" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-slate-600 leading-relaxed line-clamp-6">{note.content}</p>
                  <p className="mt-3 text-xs text-slate-400">{new Date(note.updatedAt).toLocaleDateString()}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
