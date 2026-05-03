# KDP Domination Machine

Application interne Next.js pour transformer une idée de livre en projet KDP structuré, avec stockage local-first, génération IA, conformité KDP et exports.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Stockage local-first via `localStorage`
- Auth admin simple par mot de passe
- API OpenAI compatible

## Démarrage

1. `npm install`
2. Copier `.env.example` vers `.env.local`
3. Définir `ADMIN_PASSWORD`
4. `npm run dev`

## Déploiement

Ordre recommandé :

1. GitHub : créer le dépôt et pousser la branche principale
2. Vercel : importer le dépôt GitHub, définir `ADMIN_PASSWORD`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`
3. Google Drive / Sheets : utiliser les exports `JSON`, `CSV`, `DOCX`, `Markdown` générés dans `exports/`

## Export

- Import/export JSON côté client
- Export bundle structuré côté serveur local dans `exports/`
- Génération DOCX via Python `python-docx` si disponible
- Génération CSV pour import Google Sheets

## Notes KDP

Les notes internes et la checklist rappellent notamment :

- la déclaration du contenu `AI-generated` ou `AI-assisted` avant publication
- la séparation fichier intérieur / fichier couverture pour paperback
- les exigences PDF, fond perdu, marges et images haute résolution

## Google Drive

La V1 reste local-first. Le flux prévu est :

1. exporter un bundle projet
2. importer `project-sheet.csv` dans Google Sheets
3. importer `manuscript.docx` ou `manuscript.md` dans Drive selon le besoin
