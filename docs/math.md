# Catatan matematika simulator

Semua kode di `src/lib/quantum` murni (tanpa DOM) dan diuji di `tests/unit/quantum`.

## Konvensi

- **Urutan qubit big-endian**: qubit 0 adalah simbol paling kiri pada ket dan bit paling signifikan dari indeks basis.
  `|q0 q1 … q(n−1)⟩ ↔ indeks Σ q_k·2^(n−1−k)`. Contoh: X pada qubit 0 dari 3 qubit → `|100⟩` = indeks 4.
  (Qiskit memakai little-endian; kami memilih urutan buku teks agar label ket terbaca langsung.)
- State vector: `Float64Array` interleaved `[re0, im0, re1, im1, …]`, hingga 10 qubit (2¹⁰ amplitudo).
- Gerbang 1-qubit diterapkan per _stride_: untuk bit target `b`, pasangan indeks `(i, i|b)` dengan `i & b = 0`
  diperbarui dengan matriks 2×2; kontrol ditangani dengan mask (`(i & cmask) === cmask`). Tidak pernah membangun matriks 2ⁿ×2ⁿ.
- SWAP menukar amplitudo `|…1…0…⟩ ↔ |…0…1…⟩`; SWAP berkontrol = Fredkin.
- `U3(θ, φ, λ)` mengikuti OpenQASM: `[[cos θ/2, −e^{iλ} sin θ/2], [e^{iφ} sin θ/2, e^{i(φ+λ)} cos θ/2]]`.

## Pengukuran & RNG

- `measure(q, r)`: hasil 1 bila `r < P(q=1)`, lalu proyeksi + normalisasi ulang.
- RNG ber-seed **sfc32** (di-seed via splitmix32) → setiap run pengukuran bisa diputar ulang dari seed yang ditampilkan.
- Shots: CDF kumulatif + pencarian biner. Sirkuit dengan pengukuran tengah/umpan-maju klasik dijalankan ulang per shot.

## Density matrix (≤ 4 qubit)

- `ρ → UρU†` dengan menerapkan `U` ke indeks baris lalu `conj(U)` ke indeks kolom.
- Kanal Kraus 1-qubit `ρ → Σ K ρ K†`:
  - depolarizing `p`: `K = {√(1−3p/4) I, √(p/4) X, √(p/4) Y, √(p/4) Z}` ⇒ `ρ → (1−p)ρ + p I/2`;
  - dephasing `p`: `K = {√(1−p/2) I, √(p/2) Z}` ⇒ koherensi dikali `(1−p)`;
  - amplitude damping `γ`: `K₀ = diag(1, √(1−γ))`, `K₁ = [[0, √γ],[0, 0]]`.
- Entropi von Neumann: nilai eigen Hermitian lewat Jacobi pada embedding real `[[A, −B],[B, A]]`.
- Matriks tereduksi 1 qubit dihitung langsung dari state vector (hingga 10 qubit) → vektor Bloch `r = (2 Re ρ₀₁, −2 Im ρ₀₁, ρ₀₀ − ρ₁₁)`.
  `|r| < 1` berarti qubit terbelit dengan sisanya (atau campuran).

## Rotasi Bloch dari gerbang

Setiap `U = e^{iα}(cos(θ/2) I − i sin(θ/2) n·σ)`. Fase global dibuang dengan membagi `√det U`, lalu
`cos(θ/2) = Re(V₀₀+V₁₁)/2`, `n_x sin = −Im(V₀₁+V₁₀)/2`, `n_y sin = Re(V₁₀−V₀₁)/2`, `n_z sin = −Im(V₀₀−V₁₁)/2`.
Animasi Bloch Studio memutar vektor sepanjang rotasi ini (rumus Rodrigues), bukan melompat.

## Algoritma (yang diuji)

| Uji                                                                          | Hasil                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| Norma setelah setiap gerbang (acak, 4 & 10 qubit)                            | 1 ± 1e-10                                    |
| H·H = I, S² = Z, T² = S, √X² = X, HZH = X                                    | tepat                                        |
| 4 Bell state (amplitudo bertanda), entropi tereduksi = 1                     | tepat                                        |
| Teleportasi (versi pengukuran tertunda & pengukuran nyata, semua hasil acak) | fidelitas 1                                  |
| Grover n = 2…6, setiap iterasi                                               | `sin²((2k+1)θ)`, `sin θ = 1/√N`              |
| QFT n = 1…5                                                                  | sama dengan DFT `e^{2πixy/N}/√N`             |
| CHSH pada Φ+                                                                 | `S = 2√2`, menang `cos²(π/8) ≈ 85,36%`       |
| Shor N = 15, a = 7                                                           | puncak di 0, 4, 8, 12 → r = 4 → faktor 3 × 5 |

### CHSH

Mengukur "pada sudut θ" = observabel `cos θ Z + sin θ X`: putar `Ry(−θ)` lalu ukur di basis Z.
Sudut optimal: Alice `0, π/2`; Bob `π/4, −π/4`. Strategi klasik terbaik (selalu jawab 0) menang 75%.

### Shor N = 15

4 qubit penghitung (0–3) + 4 qubit kerja (4–7, bit k di qubit 7−k). Perkalian berkontrol `×a mod 15`
diwujudkan sebagai jaringan permutasi (rotasi bit untuk ×2/×8, swap untuk ×4, negasi `15 − w` lewat X).
Setelah QFT invers, pecahan berlanjut `y/16` memberi periode `r`; faktor = `gcd(a^{r/2} ± 1, 15)`.
