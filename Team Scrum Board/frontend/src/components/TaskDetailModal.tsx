import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { Attachment, Comment, ProjectMember, Task, User } from "../types";

interface Props {
  task: Task;
  members: ProjectMember[];
  projectId: string;
  currentUser: User;
  onClose: () => void;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

const priorityClasses = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

function Avatar({ user }: { user: User }) {
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
      {initials}
    </div>
  );
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  if (isImage) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 11.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0117 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13z" />
    </svg>
  );
}

export default function TaskDetailModal({
  task,
  members,
  projectId,
  currentUser,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: Props) {
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editStatus, setEditStatus] = useState(task.status);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [editAssignedToId, setEditAssignedToId] = useState(task.assignedTo?.id ?? "");
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Comment input state
  const [commentText, setCommentText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [caretIndex, setCaretIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadComments();
  }, [task.id]);

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await api.get<Comment[]>(`/tasks/${task.id}/comments`);
      setComments(res.data);
    } catch {
      // non-fatal
    } finally {
      setCommentsLoading(false);
    }
  }

  // --- Edit task ---
  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    setEditError("");
    try {
      const res = await api.patch<Task>(`/tasks/${task.id}`, {
        title: editTitle,
        description: editDescription,
        status: editStatus,
        priority: editPriority,
        dueDate: editDueDate || null,
        assignedToId: editAssignedToId || null,
      });
      onTaskUpdated(res.data);
      setIsEditing(false);
    } catch {
      setEditError("Failed to save changes.");
    }
  }

  // --- Delete task ---
  async function handleDelete() {
    try {
      await api.delete(`/tasks/${task.id}`);
      onTaskDeleted(task.id);
      onClose();
    } catch {
      setEditError("Failed to delete task.");
    }
  }

  // --- @mention handling ---
  function handleCommentInput(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? 0;
    setCommentText(value);
    setCaretIndex(caret);

    const textBefore = value.slice(0, caret);
    const match = textBefore.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(user: User) {
    const textBefore = commentText.slice(0, caretIndex);
    const textAfter = commentText.slice(caretIndex);
    const match = textBefore.match(/@(\w*)$/);
    if (match && match.index !== undefined) {
      const displayName = user.name || user.email.split("@")[0];
      const newText = textBefore.slice(0, match.index) + `@${displayName} ` + textAfter;
      setCommentText(newText);
      setCaretIndex(match.index + displayName.length + 2);
    }
    setMentionedUserIds((prev) => [...new Set([...prev, user.id])]);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  const mentionSuggestions =
    mentionQuery !== null
      ? members
          .map((m) => m.user)
          .filter((u) => {
            const q = mentionQuery.toLowerCase();
            return (
              (u.name?.toLowerCase().includes(q) ?? false) ||
              u.email.toLowerCase().includes(q)
            );
          })
      : [];

  // --- File selection ---
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // --- Submit comment ---
  async function handleSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim() && selectedFiles.length === 0) return;
    setSubmitting(true);
    setCommentError("");

    try {
      const formData = new FormData();
      formData.append("content", commentText.trim());
      mentionedUserIds.forEach((id) => formData.append("mentionedUserIds", id));
      selectedFiles.forEach((file) => formData.append("files", file));

      const res = await api.post<Comment>(`/tasks/${task.id}/comments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
      setSelectedFiles([]);
      setMentionedUserIds([]);
    } catch {
      setCommentError("Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Delete comment ---
  async function handleDeleteComment(commentId: string) {
    try {
      await api.delete(`/tasks/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // non-fatal
    }
  }

  function renderCommentContent(comment: Comment) {
    const mentionNames = new Map(comment.mentions.map((m) => [m.user.name || m.user.email.split("@")[0], m.user]));
    const parts = comment.content.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        if (mentionNames.has(name)) {
          return (
            <span key={i} className="rounded bg-blue-100 px-1 font-medium text-blue-700">
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  }

  function isImageFile(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const localTask = {
    title: isEditing ? editTitle : task.title,
    description: isEditing ? editDescription : task.description,
    status: isEditing ? editStatus : task.status,
    priority: isEditing ? editPriority : task.priority,
    dueDate: isEditing ? editDueDate : task.dueDate,
    assignedTo: task.assignedTo,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          {isEditing ? (
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-lg font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
              required
            />
          ) : (
            <h2 className="text-xl font-semibold text-slate-900">{task.title}</h2>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  title="Edit task"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete task"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmDelete ? (
          <div className="border-b border-slate-100 bg-red-50 px-6 py-4">
            <p className="text-sm font-medium text-red-700">
              Are you sure you want to delete this task? All comments will also be removed.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-6 py-5">
          {/* Edit form or view mode */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</div>
              ) : null}
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  rows={4}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Task["status"])}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Priority</span>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Task["priority"])}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Due date</span>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Assign to</span>
                  <select
                    value={editAssignedToId}
                    onChange={(e) => setEditAssignedToId(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name || m.user.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditError(""); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityClasses[task.priority]}`}>
                  {task.priority.toLowerCase()} priority
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {task.status === "TODO" ? "To Do" : task.status === "IN_PROGRESS" ? "In Progress" : "Done"}
                </span>
                {task.dueDate ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                ) : null}
                {task.assignedTo ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                    {task.assignedTo.name || task.assignedTo.email}
                  </span>
                ) : null}
              </div>
              {task.description ? (
                <p className="text-sm text-slate-600">{task.description}</p>
              ) : (
                <p className="text-sm italic text-slate-400">No description.</p>
              )}
            </div>
          )}

          {/* Comments section */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Comments {comments.length > 0 ? `(${comments.length})` : ""}
            </h3>

            {commentsLoading ? (
              <p className="text-sm text-slate-400">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-sm italic text-slate-400">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar user={comment.author} />
                    <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          {comment.author.name || comment.author.email}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                          {comment.author.id === currentUser.id ? (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              title="Delete comment"
                              className="ml-1 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.786-.711z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {renderCommentContent(comment)}
                      </p>
                      {/* Attachments */}
                      {comment.attachments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {comment.attachments.map((att: Attachment) =>
                            isImageFile(att.filename) ? (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={att.url}
                                  alt={att.filename}
                                  className="h-24 w-24 rounded-lg object-cover border border-slate-200 hover:opacity-90 transition"
                                />
                              </a>
                            ) : (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                              >
                                <FileIcon filename={att.filename} />
                                <span className="max-w-[140px] truncate">{att.filename}</span>
                              </a>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <form onSubmit={handleSubmitComment} className="mt-5">
              {commentError ? (
                <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{commentError}</div>
              ) : null}
              <div className="flex gap-3">
                <Avatar user={currentUser} />
                <div className="flex-1 space-y-2">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={commentText}
                      onChange={handleCommentInput}
                      placeholder="Add a comment… type @ to mention someone"
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 resize-none"
                    />
                    {/* @mention dropdown */}
                    {mentionSuggestions.length > 0 ? (
                      <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                        {mentionSuggestions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => selectMention(user)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <Avatar user={user} />
                            <div>
                              <div className="font-medium text-slate-800">{user.name || "—"}</div>
                              <div className="text-xs text-slate-500">{user.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Selected files preview */}
                  {selectedFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                        >
                          <FileIcon filename={file.name} />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="ml-1 text-slate-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach files"
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a1.5 1.5 0 002.122 2.121l7-7a.75.75 0 011.06 1.06l-7 7a3 3 0 01-4.242-4.243l7-7a4.5 4.5 0 016.364 6.364l-7 7a6 6 0 01-8.486-8.486l6.5-6.5a.75.75 0 011.061 1.06l-6.5 6.5a4.5 4.5 0 006.364 6.364l7-7a3 3 0 000-4.243z" clipRule="evenodd" />
                      </svg>
                      Attach
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <button
                      type="submit"
                      disabled={submitting || (!commentText.trim() && selectedFiles.length === 0)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                    >
                      {submitting ? "Posting…" : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
