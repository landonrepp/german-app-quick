# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` — Next.js App Router pages (`page.tsx`, `mine/page.tsx`, `export/page.tsx`), root `layout.tsx`, and styles.
- `src/components/` — Reusable UI components (e.g., `FileUploader.tsx`, `SentenceListItem.tsx`).
- `src/utils/` — Server/data utilities: `db.ts`, `miningDao.ts`, `fileReader.ts`, `text.ts`, `jobs/translation-job.ts`.
- `migrations/` — SQLite schema files (e.g., `0001_init.sql`); auto‑applied at server start.
- `lang-detection/` — Rust→WASM language detector under `lang-detection/pkg`.
- Local DB lives at `./db.sqlite` (gitignored).

## Build, Test, and Development Commands
- `npm run dev` — Start dev server (Turbopack) at http://localhost:3000.
- `npm run build` — Create production build.
- `npm start` — Serve the built app.
- `npm run lint` — Run ESLint (Next + TypeScript rules).
- `npm test` / `npm run test:watch` — Jest + @testing-library/react. Example coverage: `npm test -- --coverage`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict), 2‑space indentation.
- Components: PascalCase files (e.g., `FileUploader.tsx`); use Client/Server components per Next 15.
- Utils: lowerCamelCase (e.g., `fileReader.ts`, `miningDao.ts`).
- Imports: Use `@/` alias for `src` (e.g., `@/utils/db`).
- Lint before pushing: `npm run lint` should pass with no warnings.

## Testing Guidelines
- Frameworks: Jest + @testing-library/react (jsdom). Config in `jest.config.mjs` and `jest.setup.ts`.
- Location/Names: place tests in `__tests__/` and name `*.test.ts(x)` or `*.spec.ts(x)`.
- Focus: critical flows (upload → import → mine → export) and DB utilities (mock DB where possible).
- Run locally: `npm test` or `npm run test:watch` during development.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat: import CSV to DB`). Keep scope small and messages descriptive.
- PRs: include a concise summary and rationale, linked issues, and screenshots/GIFs for UI changes. Ensure lint/tests pass.
- Database changes: add new, numbered migration files in `migrations/` (never edit applied ones).

## Security & Configuration Tips
- SQLite at `./db.sqlite`; no external secrets required.
- Translation job env vars: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `TRANSLATION_POLL_MS`, `TRANSLATION_BATCH_SIZE`, `TRANSLATION_JOB_AUTOSTART` (dev only), `TRANSLATION_DEV_FALLBACK` (dev only).
- Coordinate schema changes (e.g., `anki_cards`) via PR before merging.

