/** Thin Upstash Redis REST client — no SDK, just fetch. */

function base() {
  return (process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/+$/, "");
}

function auth() {
  return { authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ""}` };
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
