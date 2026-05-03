import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD n'est pas encore configure sur l'environnement de deploiement."
      },
      { status: 503 }
    );
  }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe invalide." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("kdp-admin-session", "ok", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14
  });

  return response;
}
