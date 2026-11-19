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

## Fase 2 — simulator

- `src/lib/quantum`: state vector (≤10 qubit), katalog gerbang lengkap (I, X, Y, Z, H, S, S†, T, T†, √X, Rx/Ry/Rz, P, U3, SWAP, kontrol umum → CNOT/CZ/Toffoli/Fredkin/controlled-U), pengukuran + kondisi klasik, RNG ber-seed, sampling shots.
- Density matrix ≤4 qubit dengan kanal depolarizing, dephasing, amplitude damping; matriks tereduksi, entropi, purity.
- Pembangun sirkuit: Bell, Deutsch–Jozsa, Bernstein–Vazirani, teleportasi, superdense coding, Grover, QFT/QFT⁻¹, Shor N=15; permainan CHSH.
- Zod schema + serialisasi JSON & URL (lz-string).
- Web Worker (Comlink) `src/workers/sim.worker.ts` + klien dengan fallback ke utas utama (`src/lib/sim-client.ts`).
- 166 unit test — lihat `docs/math.md`.

## Fase 3 — fondasi 3D & Bloch Studio

- `WebGPURenderer` (three r187) lewat factory `gl` async R3F v9; fallback otomatis ke backend WebGL2. Bila device WebGPU hilang saat berjalan, canvas dipasang ulang di WebGL2 (`DEVICE_LOST_EVENT`).
- Post-processing node `RenderPipeline`: bloom selektif via MRT `emissive`, DOF (TSL) untuk momen fokus, tone mapping AgX.
- Environment HDR **prosedural** (`scripts/generate-hdr.mjs` → `public/hdr/*.hdr`, ±170 KiB, RLE) — tanpa aset pihak ketiga, bisa offline.
- Latar scene digambar dengan TSL dan **dikompensasi invers AgX** (`src/scene/agx.ts`, diuji) agar warna kertas/tinta tampil persis sama dengan halaman.
- Bloch sphere: kaca fisik (transmission, ior, clearcoat, iridescence), rim fresnel TSL, grid lintang/bujur, sumbu berlabel KaTeX, panah emisif + panduan proyeksi, jejak memudar (alpha per-vertex di TSL), sumbu rotasi saat animasi, kabut dekoherensi (sprite instanced, swirl + noise TSL), debu ambient.
- Animasi gerbang mengikuti rotasi sebenarnya (sumbu & sudut dari `gateRotation`), antre bila gerbang ditekan beruntun; pengukuran = snap + kilat.
- Kualitas adaptif: `PerformanceMonitor` (DPR & tier), tier `low` otomatis untuk HP lemah / renderer software (SwiftShader, llvmpipe); `frameloop="demand"` + ticker ambient yang berhenti 7 detik setelah interaksi terakhir.
- Bloch Studio: gerbang (tooltip berisi matriks KaTeX), rotasi bersudut, slider θ/φ, keadaan (ket atau ρ), amplitudo berwarna fase + roda fase, ukur sekali, shots ber-seed + replay, histogram (d3-scale), dekoherensi (3 kanal, kekuatan, "biarkan meluruh"), riwayat + undo. Mobile: bilah gerbang + bottom sheet bertab.

### Catatan verifikasi

- Jalur WebGL2 diverifikasi lewat screenshot Playwright (SwiftShader). Jalur WebGPU tidak dapat diverifikasi di lingkungan headless ini (adapter SwiftShader kehilangan device bahkan untuk contoh three.js minimal); pemulihan ke WebGL2 setelah device hilang terverifikasi.
