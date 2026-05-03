"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Connexion impossible.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="mx-auto w-full max-w-md space-y-6" onSubmit={onSubmit}>
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-gold">
          Admin access
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-ink">
          Connexion sécurisée
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Utilise le mot de passe administrateur pour accéder à l’atelier KDP.
        </p>
      </div>
      <Input
        required
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Mot de passe admin"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Connexion..." : "Entrer dans l’application"}
      </Button>
    </form>
  );
}

