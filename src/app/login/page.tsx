import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="panel grid w-full max-w-5xl gap-8 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
        <section className="bg-ink px-8 py-10 text-white lg:px-12 lg:py-14">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200">
            Private Ops Suite
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
            KDP Domination Machine
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200">
            Une chaîne de production éditoriale pensée pour faire passer une idée
            de livre à un package KDP prêt à publier, avec prompts spécialisés,
            checklist IA Amazon et exports structurés.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              "Concept best-seller scoré",
              "Plan et chapitres générés",
              "Correction et humanisation",
              "Packaging SEO et checklist KDP"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center px-8 py-10 lg:px-12">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

