import { NextRequest } from "next/server";
import { SESSION_COOKIE, authConfigured, syncConfigured, verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  return Response.json({
    authConfigured: authConfigured(),
    syncConfigured: syncConfigured(),
    user,
  });
}
