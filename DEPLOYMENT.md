# Deploy V1

## 1. GitHub

- Créer un dépôt GitHub vide
- Ajouter le remote `origin`
- Committer et pousser la V1

## 2. Vercel

- Importer le dépôt GitHub dans Vercel
- Framework : Next.js
- Variables d'environnement :
  - `ADMIN_PASSWORD`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_BASE_URL`

## 3. Google Drive / Sheets

- Utiliser l'export applicatif pour générer un dossier dans `exports/`
- Importer `project-sheet.csv` dans Google Sheets pour pilotage éditorial
- Importer `manuscript.docx` dans Google Drive si une édition collaborative est nécessaire

## Notes

- La V1 n'utilise pas Supabase
- Le stockage primaire reste local-first dans le navigateur
- Google Drive / Sheets sert d'organisation secondaire et de partage
