import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("kdp-admin-session", "", { path: "/", maxAge: 0 });
  return response;
}

