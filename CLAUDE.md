# Spooky — aturan untuk sesi berikutnya

## Aturan Git (WAJIB)

- Commit sesedikit mungkin: **SATU commit per fase**, hanya saat build & test lulus.
- Format pesan commit: `feat: fase N — <ringkasan>`.
- **JANGAN** tambahkan `Co-Authored-By`, "Generated with Claude Code", tautan sesi, atau atribusi AI apa pun di commit, PR, README, atau file lain.
- Push langsung ke `main`.

## Proyek

- Vite + React 19 + TypeScript strict (tanpa `any`), three.js WebGPURenderer (fallback WebGL2) + TSL, R3F v9, shadcn/ui + Tailwind v4 (CSS-first, OKLCH), GSAP, KaTeX, dnd-kit, Zustand, HashRouter, Zod, i18next.
- 100% client-side: tanpa backend, akun, atau tracking. Aset (font, HDR) self-hosted.
- Simulator kuantum murni di `src/lib/quantum` (diuji di `tests/unit`). Jangan ubah tanpa menjalankan `npm test`.
- Semua teks UI lewat i18next (`src/i18n/locales/{id,en}.ts`); konten dwibahasa `{ id, en }` divalidasi Zod.
- Progres & catatan matematika: `docs/`.

## Perintah

- `npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run e2e`
