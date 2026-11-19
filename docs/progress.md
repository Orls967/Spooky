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

## Fase 4 — Spooky Action

- Ukuran keterikatan untuk keadaan campuran: **concurrence Wootters** (`entanglement.ts`) via akar Hermitian (diagonalisasi embedding real dengan vektor eigen Jacobi). Diuji: Bell = 1, produk = 0, `C = sin 2θ`, Werner `C = max(0, 1 − 3q/2)`.
- Scene: dua bola Bloch (Alice & Bob) yang menampilkan keadaan **tereduksi** masing-masing (panah nol + kabut penuh untuk Bell), dihubungkan "benang hantu": 3 untai heliks + kabut tabung, material TSL (noise mengalir, shimmer, inti menghadap kamera, emissive untuk bloom). Opasitas = concurrence; kilat merambat dari sisi yang diukur.
- Tab **Pasangan Bell**: 4 keadaan Bell, basis Z/X untuk Alice & Bob, ukur → runtuh + kilat, tabel korelasi 1000 pasangan + korelator E, derau depolarisasi pasangan (concurrence & purity).
- Tab **CHSH**: aturan (KaTeX), strategi kuantum (4 slider sudut, tombol sudut optimal) vs klasik, peluang menang & nilai S teoretis eksak, ronde animasi (sumbu ukur tampil di bola; Bob dikondisikan pada hasil Alice), 2000 ronde ber-seed dengan grafik konvergensi terhadap batas 75% & Tsirelson.
- Tab **Entropi**: keluarga `cos θ|00⟩ + sin θ|11⟩`, kurva S(θ) (d3-shape), panah tiap qubit memendek seiring keterikatan.
- CameraRig kini menyesuaikan jarak kamera dengan rasio aspek (`fitRadius`).

## Fase 5 — Circuit Composer

- Store Zustand (`src/store/composer.ts`): sirkuit berkolom, cek tumpang-tindih rentang (`fits`), sisip kolom otomatis bila sel terisi, undo/redo (100 langkah), persist ke localStorage (divalidasi Zod saat dimuat).
- Grid DOM: drag & drop **dnd-kit** (palet → sel, gerbang → sel lain; deteksi tabrakan berbasis pointer) **dan** mode ketuk (ketuk gerbang lalu ketuk sel) untuk layar sentuh. Glyph standar: kotak, ⊕ (CNOT), titik (CZ/kontrol), × (SWAP), meter (M), label kondisi klasik.
- Inspektor: ganti gerbang dasar (→ controlled-U umum), target, kontrol per qubit, parameter (kelipatan π/8), kondisi klasik, hapus. Di HP tampil sebagai bottom sheet saat gerbang diketuk.
- Step-through maju/mundur/putar + playhead; header kolom bisa diklik.
- Simulasi di **Web Worker** (Comlink) dengan debounce; shots 1024 via worker (sirkuit dengan pengukuran tengah dijalankan ulang per shot).
- Simpan/muat JSON (Zod), bagikan URL (`#/composer?c=` lz-string), ekspor diagram **SVG/PNG**, contoh siap pakai (Bell, GHZ, teleportasi, Grover, QFT, Deutsch–Jozsa).
- Visual 3D: **Amplitude City** (InstancedMesh, tinggi = probabilitas, warna = fase Spektra, transisi halus antar langkah, tooltip hover), **Q-sphere** (lintang = bobot Hamming, ukuran ∝ √p, jari-jari berwarna fase), **Bloch per qubit** (keadaan tereduksi; panah pendek = terbelit).
- Uji: unit store composer; e2e ketuk-taruh (Bell + step back), drag & drop, muat dari URL bersama.

## Fase 6 — Algoritma

- 7 walkthrough (`src/content/algorithms.ts`, teks `{ id, en }` divalidasi Zod, KaTeX inline via `RichText`): Deutsch–Jozsa, Bernstein–Vazirani, teleportasi (Bloch per qubit), superdense coding, Grover (+ panel **geometri rotasi** 2θ), QFT (+ **roda fase** per amplitudo), Shor mini N=15 (+ distribusi register penghitung, pecahan berlanjut, gcd → 3 × 5).
- Parameter interaktif (oracle, rahasia s, keadaan pesan, bit, item ditandai & jumlah qubit, input x, basis a).
- Navigasi langkah / putar otomatis, diagram sirkuit mini dengan sorotan tahap aktif, transisi teks GSAP (useGSAP), tombol **Buka langkah ini di Composer** (memuat sirkuit hingga tahap tsb).
- Tampilan menormalkan fase global (amplitudo terbesar real-positif) — fase global tidak teramati, dan tanpa ini difuser Grover (= −D) membalik semua warna.

## Fase 7 — Puzzle

- 22 level dalam 3 bab (1, 2, 3 qubit) — `src/content/puzzles.ts` (teks dwibahasa divalidasi Zod). Target didefinisikan oleh sirkuit referensi, sehingga keadaan target selalu tepat; KaTeX target ditulis tangan untuk tampilan.
- Validator murni `src/lib/puzzle.ts`: fidelitas `|⟨target|ψ⟩|² ≥ 0.999` (fase global diabaikan), kendala gerbang yang diizinkan (CNOT/CZ/Toffoli/controlled-U dipetakan ke kuncinya), bintang: ★★★ bila gerbang ≤ par **dan** kedalaman ≤ par-kedalaman, ★★ bila ≤ par+2, ★ bila terselesaikan.
- Uji unit: setiap level diselesaikan oleh solusi referensinya dengan tepat par gerbang & kedalaman (3 bintang), sirkuit kosong tidak pernah menyelesaikan, gerbang terlarang ditolak, ambang 0.999.
- Store sirkuit dijadikan factory (`createCircuitStore`) sehingga editor puzzle memakai grid, dnd-kit, mode ketuk & inspektor yang sama dengan Composer (inspektor mode puzzle menyembunyikan opsi yang tak relevan).
- Papan puzzle: target (KaTeX + batang fase) vs keadaanmu, meter fidelitas dengan garis ambang, petunjuk, 3D: bola Bloch + panah bayangan target (1 qubit) atau Amplitude City + menara bayangan target (2–3 qubit); banner berhasil beranimasi GSAP.
- Progres (bintang terbaik) disimpan di localStorage dengan try/catch; level terbuka berurutan.

## Fase 8 — intro, glosarium, pencarian, Tentang, polish

- **Intro scroll**: kanvas sticky + GSAP ScrollTrigger (scrub) menulis progres 0…5 yang dibaca tiap frame — semua keadaan adalah fungsi murni dari progres, sehingga menggulir balik memutar cerita mundur. Koin dibuat dari verteks bola dan ber-_morph_ (morph target + normal) kembali menjadi bola, lalu menjadi bola Bloch; dua sisi koin diwarnai lewat TSL. Kamera digeser dengan `setViewOffset` di layar lebar agar teks tidak menutupi scene. Rendering berhenti saat cerita tidak terlihat.
- **Glosarium** 34 istilah (Zod), saring, indeks A–Z, deep-link `?t=slug` yang menyorot istilah, "lihat juga", tautan ke modul. **Auto-link**: matcher Unicode-aware (`\p{L}`) per bahasa, tautan pada kemunculan pertama tiap istilah per blok, pratinjau definisi (KaTeX) di tooltip — dipakai di semua teks algoritma, Tentang, dan glosarium sendiri.
- **Pencarian global** Ctrl/⌘+K: modul, algoritma, istilah glosarium, level puzzle, aksi tema/bahasa; peringkat kustom (awalan label > substring > kata kunci).
- **Tentang**: apa ini, 5 batasan model (termasuk batas qubit & alasannya), privasi, sumber, kredit, teknologi.
- **Offline**: plugin Vite membuat `dist/sw.js` berisi daftar seluruh file build (cache-first untuk aset, network-first untuk halaman, `ignoreVary` karena import modul mengirim `Origin`). Diuji e2e: setelah kunjungan pertama, Glosarium dan Composer terbuka tanpa jaringan.
- Uji tambahan: unit (glosarium, auto-link, kelengkapan konten dwibahasa, setiap tahap algoritma punya teks), e2e (intro scroll, glosarium, pencarian, Tentang, offline).

## Status akhir

- Unit test Vitest & e2e Playwright (desktop + mobile) lulus; lint & typecheck bersih.
- Jalur WebGL2 diverifikasi visual di semua modul; jalur WebGPU tidak dapat diverifikasi di lingkungan headless (lihat catatan Fase 3), pemulihan ke WebGL2 diverifikasi.
