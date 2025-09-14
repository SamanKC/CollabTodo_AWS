export async function apiFetch<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("access_token");
  const res = await fetch(`${import.meta.env.VITE_API_BASE}${url}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}
