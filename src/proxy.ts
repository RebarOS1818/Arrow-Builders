import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next 16 request interceptor — refreshes the Supabase session and gates auth. */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
