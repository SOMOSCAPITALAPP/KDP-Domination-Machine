import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KDP Domination Machine",
  description: "Workflow privé pour produire des projets Amazon KDP rapidement."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

