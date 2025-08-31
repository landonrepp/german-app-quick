# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` — Next.js App Router pages: `page.tsx`, `mine/page.tsx`, `export/page.tsx`, root `layout.tsx`, and styles.
- `src/components/` — Reusable UI (e.g., `FileUploader.tsx`, `SentenceListItem.tsx`).
- `src/utils/` — Server/data utilities: `db.ts`, `miningDao.ts`, `fileReader.ts`, `text.ts`, `jobs/translation-job.ts`.
- `migrations/` — SQLite schema files (e.g., `0001_init.sql`); applied automatically at server start.
- `lang-detection/` — Rust→WASM language detector under `lang-detection/pkg`.
- Local DB: `./db.sqlite` (ignored by Git).

## Build, Test, and Development Commands
- `npm run dev` — Start dev server (Turbopack) at http://localhost:3000.
- `npm run build` — Production build.
- `npm start` — Serve the built app.
- `npm run lint` — ESLint (Next + TypeScript rules).
- `npm test` / `npm run test:watch` — Jest + @testing-library/react (jsdom). Example coverage: `npm test -- --coverage`.

## Coding Style & Naming Conventions
- Language: TypeScript (strict), 2-space indentation.
- Components: PascalCase files (e.g., `FileUploader.tsx`); client/server components per Next 15.
- Utils: lowerCamelCase (e.g., `fileReader.ts`, `miningDao.ts`).
- Imports: Use `@/` alias for `src` (e.g., `@/utils/db`).

## Testing Guidelines
- Frameworks: Jest + @testing-library/react. Config in `jest.config.mjs` and `jest.setup.ts`.
- Location/Names: `__tests__/` folders; `*.test.ts(x)` or `*.spec.ts(x)` (see `src/components/__tests__/FileUploader.test.tsx`).
- Focus: Critical flows (upload → import → mine → export) and DB utilities (mock DB where possible).

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`). Keep scope small and messages descriptive.
- PRs include: concise summary + rationale, linked issues, screenshots/GIFs for UI, and passing lint/tests.
- Database changes: add new, numbered migration files in `migrations/` (never edit applied ones).

## Security & Configuration Tips
- SQLite lives at `./db.sqlite`; no external secrets required.
- Environment (for translation job): `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `TRANSLATION_POLL_MS`, `TRANSLATION_BATCH_SIZE`, `TRANSLATION_JOB_AUTOSTART` (dev only), `TRANSLATION_DEV_FALLBACK` (dev only).
- Coordinate schema changes (e.g., `anki_cards`) via PR before merging.
