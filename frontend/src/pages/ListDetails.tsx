// src/pages/ListDetails.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { isAuthenticated } from "../lib/auth";

type List = {
  id: string;
  title: string;
  description?: string | null;
  createdAt?: string;
};

type Task = {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: string;
};

// ----- Local storage helpers (lists + tasks) -----
const LS_LISTS_KEY = "lists";
const tasksKey = (listId: string) => `tasks:${listId}`;

function loadAllLists(): List[] {
  try {
    return JSON.parse(localStorage.getItem(LS_LISTS_KEY) || "[]") as List[];
  } catch {
    return [];
  }
}
function saveAllLists(lists: List[]) {
  localStorage.setItem(LS_LISTS_KEY, JSON.stringify(lists));
}

function loadTasks(listId: string): Task[] {
  try {
    return JSON.parse(localStorage.getItem(tasksKey(listId)) || "[]") as Task[];
  } catch {
    return [];
  }
}
function saveTasks(listId: string, tasks: Task[]) {
  localStorage.setItem(tasksKey(listId), JSON.stringify(tasks));
}

export default function ListDetails() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const location = useLocation() as { state?: { list?: List } };

  // list passed from Dashboard (for immediate display)
  const passed = location.state?.list;
  const [list, setList] = useState<List | null>(passed ?? null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState(passed?.title ?? "");
  const [desc, setDesc] = useState(passed?.description ?? "");

  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      nav("/", { replace: true });
      return;
    }
    if (!id) return;

    setLoading(true);
    setErr(null);

    // Load list from localStorage if not passed
    let selected: List | null = passed ?? null;
    if (!selected) {
      const all = loadAllLists();
      selected = all.find((l) => l.id === id) ?? null;
    }
    if (!selected) {
      setErr("List not found locally.");
      setLoading(false);
      return;
    }
    setList(selected);
    setTitle(selected.title ?? "");
    setDesc(selected.description ?? "");

    // Load tasks locally
    const t = loadTasks(id);
    setTasks(t);
    setLoading(false);
  }, [id, nav, passed]);

  const progress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pct };
  }, [tasks]);

  // ----- List meta save (local-only) -----
  function saveListMetaLocal(next: Partial<List>) {
    if (!id || !list) return;
    const all = loadAllLists();
    const idx = all.findIndex((l) => l.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...next };
      saveAllLists(all);
      setList(all[idx]);
    }
  }

  // ----- Task CRUD (local-only) -----
  function addTask() {
    if (!id || !text.trim()) return;
    setCreating(true);
    try {
      const newTask: Task = {
        id: crypto.randomUUID ? crypto.randomUUID() : `t_${Date.now()}`,
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };
      const next = [newTask, ...tasks];
      setTasks(next);
      saveTasks(id, next);
      setText("");
    } finally {
      setCreating(false);
    }
  }

  function toggleTask(t: Task) {
    if (!id) return;
    const next = tasks.map((x) =>
      x.id === t.id ? { ...x, completed: !x.completed } : x
    );
    setTasks(next);
    saveTasks(id, next);
  }

  function startEditTask(t: Task) {
    setEditingId(t.id);
    setEditText(t.text);
  }

  function saveTask(t: Task) {
    if (!id) return;
    const nextText = editText.trim();
    if (!nextText || nextText === t.text) {
      setEditingId(null);
      return;
    }
    const next = tasks.map((x) => (x.id === t.id ? { ...x, text: nextText } : x));
    setTasks(next);
    saveTasks(id, next);
    setEditingId(null);
  }

  function removeTask(t: Task) {
    if (!id) return;
    const next = tasks.filter((x) => x.id !== t.id);
    setTasks(next);
    saveTasks(id, next);
  }

  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-emerald-600 hover:underline">
          &larr; Back to all lists
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        {loading && !list ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-56 bg-gray-200 rounded" />
            <div className="h-4 w-80 bg-gray-100 rounded" />
            <div className="h-4 w-40 bg-gray-100 rounded" />
          </div>
        ) : list ? (
          <>
            {/* Header / metadata */}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <input
                  className="w-full text-2xl font-semibold text-gray-900 border-0 focus:ring-0 px-0"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    saveListMetaLocal({ title: e.target.value || "Untitled" });
                  }}
                />
                <textarea
                  className="w-full mt-1 text-gray-600 border-0 focus:ring-0 px-0"
                  placeholder="Add a description…"
                  rows={2}
                  value={desc ?? ""}
                  onChange={(e) => {
                    setDesc(e.target.value);
                    saveListMetaLocal({ description: e.target.value });
                  }}
                />
                <div className="text-xs text-gray-400 mt-1">
                  {list.createdAt
                    ? `Created ${new Date(list.createdAt).toLocaleDateString()}`
                    : ""}
                </div>
              </div>

              {/* Progress */}
              <div className="min-w-[220px]">
                <div className="text-sm text-gray-600 mb-1">
                  {progress.done}/{progress.total} complete
                </div>
                <div className="h-2 w-full bg-gray-100 rounded">
                  <div
                    className="h-2 bg-emerald-500 rounded"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Add task */}
            <div className="mt-6 flex gap-3">
              <input
                className="flex-1 rounded-lg border px-3 py-2"
                placeholder="Add a new task…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask();
                }}
              />
              <button
                onClick={addTask}
                disabled={creating || !text.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
              >
                {creating ? "Adding…" : "Add"}
              </button>
            </div>

            {/* Task list */}
            <ul className="mt-4 divide-y rounded-xl border overflow-hidden">
              {tasks.length === 0 ? (
                <li className="p-4 text-gray-500 text-sm">
                  No tasks yet. Add your first one above.
                </li>
              ) : (
                tasks.map((t) => (
                  <li
                    key={t.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggleTask(t)}
                        className="h-4 w-4 text-emerald-600"
                      />
                      {editingId === t.id ? (
                        <input
                          className="flex-1 border rounded px-2 py-1"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTask(t);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => saveTask(t)}
                          autoFocus
                        />
                      ) : (
                        <button
                          className={`text-left truncate ${
                            t.completed
                              ? "line-through text-gray-500"
                              : "text-gray-900"
                          }`}
                          onClick={() => startEditTask(t)}
                          title="Click to edit"
                        >
                          {t.text}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => removeTask(t)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>

            {err && (
              <div className="mt-4 text-sm text-red-600">
                <span className="font-medium">Error:</span> {err}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-600">List not found.</div>
        )}
      </div>
    </div>
  );
}
