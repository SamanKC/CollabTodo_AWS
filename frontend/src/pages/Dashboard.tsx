// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  isAuthenticated,
  login,
  logout,
  getTokens,
  refreshIfNeeded,
} from "../lib/auth";

/** Types */
type Me = {
  userId: string | null;
  email: string | null;
  issuer: string | null;
};

type TodoList = {
  id: string;
  title: string;
  description?: string;
  createdAt?: string;
};

/** Helpers */
const API_BASE = (import.meta.env.VITE_API_BASE as string)?.replace(/\/+$/, "") + "/";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-gray-200 bg-white shadow-sm transition",
        "hover:shadow-md",
        className
      )}
    >
      {(title || right || subtitle) && (
        <div className="flex items-start justify-between gap-4 p-5 border-b">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

/** Dashboard */
export default function Dashboard() {
  const authed = isAuthenticated();
  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [lists, setLists] = useState<TodoList[] | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  /** Load profile + lists */
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!authed) return;

      try {
        setErr(null);
        setLoadingMe(true);
        await refreshIfNeeded();

        const idToken = getTokens()?.id_token;
        if (!idToken) throw new Error("Missing id_token after refresh.");

        // /v1/me
        const meRes = await fetch(`${API_BASE}v1/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!meRes.ok) throw new Error(`GET /v1/me: ${meRes.status}`);
        const meJson = (await meRes.json()) as Me;
        if (!abort) setMe(meJson);

        // Try to fetch lists if backend supports it (safe if 404)
        setLoadingLists(true);
        const listRes = await fetch(`${API_BASE}v1/lists`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (listRes.ok) {
          const data = (await listRes.json()) as TodoList[] | { items?: TodoList[] };
          const items = Array.isArray(data) ? data : data.items ?? [];
          if (!abort) setLists(items);
        } else if (listRes.status === 404) {
          // Endpoint not implemented yet — show empty gracefully
          if (!abort) setLists([]);
        } else {
          const txt = await listRes.text();
          throw new Error(`GET /v1/lists: ${listRes.status} ${txt}`);
        }
      } catch (e) {
        if (!abort) setErr((e as Error).message);
      } finally {
        if (!abort) {
          setLoadingMe(false);
          setLoadingLists(false);
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [authed]);

  /** Create a new list */
  async function createList(e: React.FormEvent) {
  e.preventDefault();
  setErr(null);
  if (!title.trim()) return;

  const optimistic: TodoList = {
    id: `tmp-${Date.now()}`,
    title: title.trim(),
    description: desc.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  // 1) Optimistic UI add
  setLists((prev) => (prev ? [optimistic, ...prev] : [optimistic]));

  try {
    await refreshIfNeeded();
    const idToken = getTokens()?.id_token;
    if (!idToken) throw new Error("Missing id_token.");

    const res = await fetch(`${API_BASE}v1/lists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: optimistic.title,
        description: optimistic.description,
      }),
    });

    // 2) If the server fails, keep the optimistic item visible
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      setErr(`POST /v1/lists failed: ${res.status} ${txt}`);
      setTitle("");
      setDesc("");
      return; // don't remove the optimistic item
    }

    // 3) Try to merge server response if it’s valid JSON (id, timestamps, etc.)
    let saved: Partial<TodoList> | null = null;
    try {
      saved = await res.json();
    } catch {
      // Some backends return empty body or text; keep optimistic if parsing fails
      saved = null;
    }

    if (saved && (saved.id || saved.title || saved.description || saved.createdAt)) {
      setLists((prev) =>
        (prev ?? []).map((l) => (l.id === optimistic.id ? { ...optimistic, ...saved } as TodoList : l))
      );
    }

    setTitle("");
    setDesc("");
  } catch (e) {
    // 4) Network/parse errors: keep optimistic item; just show the error
    setErr((e as Error).message);
    // DO NOT remove the optimistic item
  }
}

  /** Logged-out hero */
  if (!authed) {
    return (
      <div className="grid place-items-center py-24">
        <Card
          title="Collaborative To-Do"
          subtitle="Organize tasks and share progress — sign in to get started."
          right={<Badge>Guest</Badge>}
          className="max-w-2xl w-full"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p>
                You’re not signed in. Click <span className="font-medium">Sign in</span> to
                authenticate with Cognito.
              </p>
            </div>
            <button
              onClick={login}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:scale-[.99] transition"
            >
              Sign in
            </button>
          </div>
        </Card>
      </div>
    );
  }

  /** Logged-in view */
  return (
    <div className="space-y-6 animate-[fadeIn_.25s_ease-out]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}
            {me?.email ? `, ${me.email}` : "!"}
          </h1>
          <p className="text-gray-600">
            Stay on top of your tasks. Create a list and start adding items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {me?.userId && <Badge>UID: {me.userId.slice(0, 8)}…</Badge>}
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black active:scale-[.98] transition"
            title="Sign out"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-5 gap-6">
        <Card
          title="New list"
          subtitle="Give it a name, optionally a short blurb."
          className="md:col-span-3"
        >
          <form onSubmit={createList} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Semester project"
                className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Optional details…"
                className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!title.trim()}
                className={cx(
                  "px-4 py-2 rounded-xl font-medium transition",
                  title.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[.99]"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                Create list
              </button>
              
            </div>
          </form>
        </Card>

        <Card
          title="Account"
          subtitle="Secure by Amazon Cognito"
          className="md:col-span-2"
          right={<Badge>Authenticated</Badge>}
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{me?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Issuer</span>
              <span className="font-medium truncate max-w-[60%] text-right" title={me?.issuer ?? ""}>
                {me?.issuer ?? "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Lists */}
      <Card
        title="Your lists"
        subtitle={loadingLists ? "Loading…" : lists?.length ? undefined : "No lists yet"}
        className="relative"
        right={
          <div className="flex items-center gap-2">
            <Badge>{lists?.length ?? 0} total</Badge>
          </div>
        }
      >
        {loadingLists && (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-gray-100 animate-pulse border border-gray-200"
              />
            ))}
          </div>
        )}

        {!loadingLists && lists && lists.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <div
                key={l.id}
                className="group rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-semibold leading-tight">{l.title}</h4>
                  {l.createdAt && (
                    <span className="text-[11px] text-gray-500">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {l.description && (
                  <p className="mt-1.5 text-sm text-gray-600 line-clamp-3">{l.description}</p>
                )}
                {!l.description && <p className="mt-1.5 text-sm text-gray-400">No description</p>}

                <div className="mt-3 flex items-center justify-end">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => alert("Coming soon: open list")}
                  >
                    Open →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loadingLists && lists && lists.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            Start by creating your first list above.
          </div>
        )}
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-6">
        Built by a team at KOI
      </div>
    </div>
  );
}
