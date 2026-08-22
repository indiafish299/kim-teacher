/** Thin Upstash Redis REST client — no SDK, just fetch. */

/** Vercel's Upstash integration injects KV_REST_API_*; a manual setup usually uses UPSTASH_*. */
export function kvUrl() {
  return (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "").replace(/\/+$/, "");
}

export function kvToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
}

function base() {
  return kvUrl();
}

function auth() {
  return { authorization: `Bearer ${kvToken()}` };
}

export async function kvGet(key: string): Promise<string | null> {
  const res = await fetch(`${base()}/get/${encodeURIComponent(key)}`, {
    headers: auth(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kv get failed (${res.status})`);
  const body = (await res.json()) as { result: string | null };
  return body.result ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const res = await fetch(`${base()}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { ...auth(), "content-type": "text/plain" },
    body: value,
  });
  if (!res.ok) throw new Error(`kv set failed (${res.status})`);
}
