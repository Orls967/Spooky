# Spooky

**Belajar komputasi kuantum lewat visual 3D interaktif.** Namanya dari ucapan Einstein tentang keterikatan kuantum — _"spukhafte Fernwirkung"_, aksi seram dari kejauhan.

100% client-side: tanpa backend, akun, atau pelacakan. Setelah dimuat sekali, aplikasi tetap berjalan offline (service worker yang meng-_precache_ seluruh build).

> _English summary below._

## Modul

| #   | Modul                | Isi                                                                                                                                                                                                                             |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Intro**            | Cerita scroll (GSAP ScrollTrigger): koin berputar → ber-_morph_ menjadi bola Bloch → superposisi → pengukuran → pasangan terbelit.                                                                                              |
| 02  | **Bloch Studio**     | Satu qubit dalam bola kaca. Gerbang (rotasi dianimasikan sepanjang sumbu sebenarnya), slider θ/φ, keadaan dalam KaTeX, amplitudo berwarna fase, ukur + histogram shots ber-seed, mode dekoherensi (3 kanal).                    |
| 03  | **Spooky Action**    | Dua qubit dengan "benang hantu" (shader TSL). Keadaan Bell, korelasi, permainan **CHSH** (klasik ≤ 75% vs kuantum ≈ 85,4%, S = 2√2), entropi keterikatan, derau pasangan.                                                       |
| 04  | **Circuit Composer** | Drag & drop (dnd-kit) **dan** ketuk-taruh, hingga 8 qubit, step-through, undo/redo, simpan/muat JSON (Zod), bagikan via URL, ekspor SVG/PNG. Visual: **Amplitude City**, **Q-sphere**, Bloch per qubit. Simulasi di Web Worker. |
| 05  | **Algoritma**        | Deutsch–Jozsa, Bernstein–Vazirani, teleportasi, superdense coding, Grover (+ geometri rotasi), QFT (+ roda fase), Shor mini N = 15. Setiap langkah bisa dibuka di Composer.                                                     |
| 06  | **Puzzle**           | 22 level "capai target dengan gerbang terbatas", fidelitas ≥ 0,999, bintang dari jumlah gerbang & kedalaman, progres di localStorage.                                                                                           |
| 07  | **Glosarium**        | 33 istilah dengan KaTeX, tertaut otomatis di seluruh teks.                                                                                                                                                                      |
| 08  | **Tentang**          | Sumber, batasan model, privasi, kredit.                                                                                                                                                                                         |

Pencarian global: **Ctrl/⌘ + K**. Bahasa Indonesia / English, tema Terang / Gelap / Ikuti sistem (diterapkan sebelum render pertama).

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173/Spooky/
npm run build      # tsc -b && vite build → dist/
npm run preview
npm test           # Vitest — simulator, konten, puzzle, i18n, serialisasi
npm run e2e        # Playwright (desktop + mobile)
npm run lint
npm run gen:hdr    # membuat ulang peta lingkungan HDR prosedural
```

Node 20+. Deploy: setiap push ke `main` menjalankan lint → test → build → GitHub Pages (`.github/workflows/deploy.yml`).

## Arsitektur

```
src/lib/quantum   simulator murni (state vector ≤10 qubit, density matrix ≤4 qubit, noise,
                  pengukuran ber-seed, algoritma, CHSH, concurrence, Zod schema, serialisasi)
src/workers       Web Worker simulator (Comlink) — fallback otomatis ke utas utama
src/scene         komponen React Three Fiber + shader TSL (WebGPURenderer, fallback WebGL2)
src/components/ui shadcn/ui (Radix) yang dikustomisasi
src/ui            shell aplikasi, KaTeX, RichText + auto-link glosarium, grafik d3
src/pages         halaman (lazy-loaded per rute)
src/content       konten dwibahasa { id, en } tervalidasi Zod
src/store         Zustand (pengaturan, composer, progres, toast)
src/i18n          i18next (kunci ID & EN diuji identik)
tests/unit        Vitest   ·   tests/e2e   Playwright
docs/             progres per fase & catatan matematika
```

Catatan matematika (konvensi big-endian, penerapan gerbang per _stride_, kanal Kraus, concurrence Wootters, rotasi Bloch dari gerbang, Shor N = 15): [`docs/math.md`](docs/math.md). Riwayat pengerjaan: [`docs/progress.md`](docs/progress.md).

## Grafik 3D

- `three/webgpu` **WebGPURenderer** lewat factory `gl` async R3F v9; fallback otomatis ke backend WebGL2, dan pemasangan ulang canvas bila device WebGPU hilang.
- Semua shader kustom ditulis dengan **TSL** (benang hantu, kabut dekoherensi, debu ambient, rim fresnel, latar, koin dua-warna). Tidak ada GLSL mentah.
- Pipeline post-processing node: bloom selektif (MRT `emissive`), DOF, tone mapping AgX. Latar dikompensasi invers AgX agar warna halaman cocok persis.
- Peta lingkungan HDR dibuat prosedural (`scripts/generate-hdr.mjs`); semua geometri dari kode.
- `frameloop="demand"` saat idle, `PerformanceMonitor` (DPR & tier kualitas), tier rendah otomatis untuk HP lemah/renderer software, mode hemat daya di menu tema, `prefers-reduced-motion` dihormati.

## Batasan (jujur)

Simulator **klasik ideal**, bukan perangkat kuantum. State vector hingga 10 qubit (Composer dibatasi 8 agar terbaca), matriks densitas hingga 4 qubit (ukuran 4ⁿ). Derau memakai model sederhana. Shor mini memakai perkalian modular yang sudah dikompilasi untuk N = 15. Keacakan pengukuran berasal dari PRNG ber-seed agar bisa diulang.

---

## English summary

Spooky is an educational quantum-computing web app built around premium, interactive 3D: a glass Bloch sphere whose arrow follows each gate's true rotation, an entangled pair joined by a TSL "ghost thread", the CHSH game, a drag-and-drop circuit composer with an _Amplitude City_ and Q-sphere, step-by-step algorithm walkthroughs (Deutsch–Jozsa, Bernstein–Vazirani, teleportation, superdense coding, Grover, QFT, mini Shor for N = 15), 22 puzzles, a glossary with auto-linking, and a scroll-driven intro. Everything runs in the browser (offline after first load), in Indonesian or English, light or dark. The simulator in `src/lib/quantum` is pure TypeScript and covered by unit tests (norm preservation, H·H = I, all Bell states, teleportation fidelity 1, Grover theory, QFT = DFT, CHSH = 2√2, Wootters concurrence, Shor peaks).

**Credits.** Fonts: Fraunces, IBM Plex Sans, JetBrains Mono (SIL OFL). Libraries: three.js, React Three Fiber, drei, KaTeX, GSAP, dnd-kit, Radix/shadcn, Zustand, Zod, i18next, d3, Comlink, lz-string.
