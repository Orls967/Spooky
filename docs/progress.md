# Progres Spooky

| Fase | Cakupan                                                                             | Status |
| ---- | ----------------------------------------------------------------------------------- | ------ |
| 1    | Scaffold, shadcn/ui + design tokens, i18n, tema, layout, routing, CLAUDE.md, deploy | ✅     |
| 2    | Simulator kuantum + Worker + unit test                                              | ⏳     |
| 3    | Fondasi 3D + Bloch Studio                                                           | ⏳     |
| 4    | Spooky Action (entanglement + CHSH) + dekoherensi                                   | ⏳     |
| 5    | Circuit Composer + Amplitude City + Q-sphere                                        | ⏳     |
| 6    | Algoritma                                                                           | ⏳     |
| 7    | Puzzle                                                                              | ⏳     |
| 8    | Intro scroll, glosarium, pencarian, Tentang, polish, optimasi HP, test, README      | ⏳     |

## Fase 1 — fondasi

- Vite 8 + React 19 + TypeScript 6 strict. (TypeScript 7 belum didukung `typescript-eslint`, jadi dipakai 6.0.x.)
- Tailwind v4 CSS-first (`src/styles/index.css`): token OKLCH untuk tema terang ("buku catatan fisika") dan gelap ("lab fisika tengah malam"), skala tipografi (Fraunces / IBM Plex Sans / JetBrains Mono, self-hosted via @fontsource).
- shadcn/ui ditulis sebagai source di `src/components/ui` (registry tidak terjangkau dari lingkungan build, jadi komponen disalin & dikustomisasi manual — radius kecil, garis rambut, tab bergaris bawah, slider bergaya instrumen).
- Tema & bahasa diterapkan oleh skrip inline di `index.html` sebelum render pertama (tanpa kedip); `ThemeController` menjaga sinkronisasi dengan preferensi sistem.
- i18next dengan kunci bertipe; unit test memastikan kunci ID & EN identik.
- HashRouter + lazy-load per halaman; pencarian global ⌘/Ctrl+K (cmdk).
- GitHub Actions: lint → test → build → deploy Pages pada setiap push ke `main`.
