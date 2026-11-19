import { z } from 'zod';
import { Bi } from './schema';
import {
  bernsteinVazirani,
  deutschJozsa,
  grover,
  groverIterations,
  qftDemo,
  shor15,
  superdense,
  teleportation,
  type StagedCircuit,
} from '@/lib/quantum/algorithms';

const r = String.raw;

export type AlgoViz = 'city' | 'bloch' | 'grover' | 'qft' | 'shor';

const StepText = z.object({ title: Bi, body: Bi }).strict();
const ParamDef = z
  .object({
    key: z.string(),
    label: Bi,
    options: z.array(z.object({ value: z.number(), label: z.string() }).strict()).min(1),
  })
  .strict();

const AlgoText = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: Bi,
    summary: Bi,
    speedup: Bi,
    intro: Bi,
    conclusion: Bi,
    params: z.array(ParamDef),
    /** step texts keyed by stage key (or stage-key prefix before "-") */
    steps: z.record(z.string(), StepText),
  })
  .strict();

export type AlgoText = z.infer<typeof AlgoText>;

export interface AlgoDef extends AlgoText {
  viz: AlgoViz;
  defaults: Record<string, number>;
  build: (p: Record<string, number>) => StagedCircuit;
  /** qubits whose final measurement is the answer (for the result readout) */
  readout?: (p: Record<string, number>) => number[];
}

const bits = (n: number) =>
  Array.from({ length: 1 << n }, (_, v) => ({ value: v, label: v.toString(2).padStart(n, '0') }));

const texts: AlgoText[] = [
  {
    id: 'deutsch-jozsa',
    title: { id: 'Deutsch–Jozsa', en: 'Deutsch–Jozsa' },
    summary: {
      id: 'Satu kueri cukup untuk memastikan apakah fungsi konstan atau seimbang.',
      en: 'One query is enough to tell whether a function is constant or balanced.',
    },
    speedup: { id: '1 kueri vs 2ⁿ⁻¹+1 (deterministik klasik)', en: '1 query vs 2ⁿ⁻¹+1 (deterministic classical)' },
    intro: {
      id: r`Kita diberi kotak hitam $f:\{0,1\}^3\to\{0,1\}$ yang dijanjikan **konstan** (selalu 0 atau selalu 1) atau **seimbang** (separuh input memberi 1). Komputer klasik deterministik bisa butuh 5 kueri. Komputer kuantum cukup 1.`,
      en: r`We are given a black box $f:\{0,1\}^3\to\{0,1\}$ promised to be **constant** (always 0 or always 1) or **balanced** (half the inputs give 1). A deterministic classical computer may need 5 queries. A quantum computer needs 1.`,
    },
    conclusion: {
      id: r`Bila register input terukur $|000\rangle$, fungsinya konstan; hasil lain apa pun berarti seimbang. Interferensi membuat semua amplitudo lain saling menghapus untuk fungsi konstan.`,
      en: r`If the input register reads $|000\rangle$ the function is constant; any other outcome means balanced. Interference cancels every other amplitude for a constant function.`,
    },
    params: [
      {
        key: 'oracle',
        label: { id: 'Oracle', en: 'Oracle' },
        options: [
          { value: -1, label: 'f = 0' },
          { value: -2, label: 'f = 1' },
          { value: 0b101, label: 'x₀⊕x₂' },
          { value: 0b111, label: 'x₀⊕x₁⊕x₂' },
          { value: 0b010, label: 'x₁' },
        ],
      },
    ],
    steps: {
      prepare: {
        title: { id: 'Siapkan ancilla |1⟩', en: 'Prepare the ancilla |1⟩' },
        body: {
          id: r`Tiga qubit input mulai di $|0\rangle$; qubit bantu (ancilla, $q_3$) dibalik ke $|1\rangle$ dengan X.`,
          en: r`The three input qubits start in $|0\rangle$; the helper (ancilla, $q_3$) is flipped to $|1\rangle$ with X.`,
        },
      },
      superpose: {
        title: { id: 'Superposisi semua input', en: 'Superpose all inputs' },
        body: {
          id: r`Hadamard pada semua qubit: input menjadi superposisi seragam dari 8 kemungkinan, ancilla menjadi $|-\rangle$. Kota amplitudo kini rata — 16 menara setinggi sama, separuh berfase $\pi$.`,
          en: r`Hadamard on every qubit: the inputs become a uniform superposition of all 8 possibilities, the ancilla becomes $|-\rangle$. The amplitude city is now flat — 16 equal towers, half with phase $\pi$.`,
        },
      },
      oracle: {
        title: { id: 'Satu kueri ke oracle', en: 'A single oracle query' },
        body: {
          id: r`Oracle memetakan $|x\rangle|y\rangle \mapsto |x\rangle|y\oplus f(x)\rangle$. Karena ancilla $|-\rangle$, efeknya adalah **phase kickback**: $|x\rangle \mapsto (-1)^{f(x)}|x\rangle$. Probabilitas tidak berubah — hanya warna (fase) yang berubah.`,
          en: r`The oracle maps $|x\rangle|y\rangle \mapsto |x\rangle|y\oplus f(x)\rangle$. With the ancilla in $|-\rangle$ this becomes **phase kickback**: $|x\rangle \mapsto (-1)^{f(x)}|x\rangle$. Probabilities do not change — only colours (phases) do.`,
        },
      },
      interfere: {
        title: { id: 'Interferensi', en: 'Interference' },
        body: {
          id: r`Hadamard lagi pada input. Amplitudo $|000\rangle$ menjadi $\frac{1}{8}\sum_x(-1)^{f(x)}$: bernilai $\pm1$ bila konstan dan tepat 0 bila seimbang.`,
          en: r`Hadamard again on the inputs. The amplitude of $|000\rangle$ becomes $\frac{1}{8}\sum_x(-1)^{f(x)}$: it is $\pm1$ when constant and exactly 0 when balanced.`,
        },
      },
      measure: {
        title: { id: 'Ukur', en: 'Measure' },
        body: {
          id: r`Ukur ketiga input. $|000\rangle$ ⇒ konstan, selain itu ⇒ seimbang — dengan kepastian 100%.`,
          en: r`Measure the three inputs. $|000\rangle$ ⇒ constant, anything else ⇒ balanced — with 100% certainty.`,
        },
      },
    },
  },
  {
    id: 'bernstein-vazirani',
    title: { id: 'Bernstein–Vazirani', en: 'Bernstein–Vazirani' },
    summary: {
      id: 'Temukan string rahasia s dari fungsi f(x) = s·x dalam satu kueri.',
      en: 'Recover a secret string s from f(x) = s·x in a single query.',
    },
    speedup: { id: '1 kueri vs n kueri klasik', en: '1 query vs n classical queries' },
    intro: {
      id: r`Oracle menyembunyikan string $s$ dan menghitung $f(x)=s\cdot x \bmod 2$. Secara klasik kita butuh $n$ kueri (satu per bit). Rangkaian yang sama dengan Deutsch–Jozsa mengungkap seluruh $s$ sekaligus.`,
      en: r`The oracle hides a string $s$ and computes $f(x)=s\cdot x \bmod 2$. Classically we need $n$ queries (one per bit). The same circuit as Deutsch–Jozsa reveals all of $s$ at once.`,
    },
    conclusion: {
      id: r`Setelah Hadamard terakhir keadaannya tepat $|s\rangle$ — kota amplitudo hanya punya satu menara.`,
      en: r`After the final Hadamards the state is exactly $|s\rangle$ — the amplitude city has a single tower.`,
    },
    params: [
      { key: 'secret', label: { id: 'Rahasia s', en: 'Secret s' }, options: bits(4).filter((o) => o.value > 0) },
    ],
    steps: {
      prepare: {
        title: { id: 'Ancilla ke |1⟩', en: 'Ancilla to |1⟩' },
        body: { id: r`Ancilla $q_4$ disiapkan di $|1\rangle$.`, en: r`The ancilla $q_4$ is prepared in $|1\rangle$.` },
      },
      superpose: {
        title: { id: 'Superposisi', en: 'Superpose' },
        body: {
          id: r`Hadamard di mana-mana: semua $2^4$ input hadir bersamaan, ancilla di $|-\rangle$.`,
          en: r`Hadamards everywhere: all $2^4$ inputs at once, ancilla in $|-\rangle$.`,
        },
      },
      oracle: {
        title: { id: 'Oracle s·x', en: 'Oracle s·x' },
        body: {
          id: r`Oracle diwujudkan sebagai CNOT dari setiap bit $s_i = 1$ ke ancilla. Phase kickback menandai $|x\rangle$ dengan $(-1)^{s\cdot x}$.`,
          en: r`The oracle is a CNOT from every bit with $s_i = 1$ to the ancilla. Phase kickback tags $|x\rangle$ with $(-1)^{s\cdot x}$.`,
        },
      },
      interfere: {
        title: { id: 'Hadamard membuka rahasia', en: 'Hadamard reveals the secret' },
        body: {
          id: r`Karena $H^{\otimes n}\sum_x(-1)^{s\cdot x}|x\rangle = 2^n|s\rangle$, seluruh amplitudo terkumpul di $|s\rangle$.`,
          en: r`Since $H^{\otimes n}\sum_x(-1)^{s\cdot x}|x\rangle = 2^n|s\rangle$, all amplitude gathers on $|s\rangle$.`,
        },
      },
      measure: {
        title: { id: 'Baca s', en: 'Read s' },
        body: { id: 'Pengukuran memberi s secara pasti.', en: 'Measurement returns s with certainty.' },
      },
    },
  },
  {
    id: 'teleportation',
    title: { id: 'Teleportasi kuantum', en: 'Quantum teleportation' },
    summary: {
      id: 'Pindahkan keadaan qubit yang tidak diketahui memakai keterikatan + 2 bit klasik.',
      en: 'Move an unknown qubit state using entanglement + 2 classical bits.',
    },
    speedup: { id: '2 bit klasik + 1 pasangan Bell', en: '2 classical bits + 1 Bell pair' },
    intro: {
      id: r`Alice punya qubit $q_0$ dalam keadaan $|\psi\rangle$ yang tidak ia ketahui. Ia berbagi pasangan Bell ($q_1$, $q_2$) dengan Bob. Tanpa mengirim qubit, $|\psi\rangle$ bisa muncul di $q_2$. Lihat bola Bloch tiap qubit.`,
      en: r`Alice holds $q_0$ in an unknown state $|\psi\rangle$. She shares a Bell pair ($q_1$, $q_2$) with Bob. Without sending the qubit, $|\psi\rangle$ can appear on $q_2$. Watch each qubit's Bloch sphere.`,
    },
    conclusion: {
      id: r`Panah $q_2$ kini identik dengan panah awal $q_0$ (fidelitas 1), sementara $q_0$ sudah runtuh — keadaan tidak digandakan (teorema no-cloning) dan tidak ada yang lebih cepat dari cahaya: Bob butuh 2 bit dari Alice.`,
      en: r`The $q_2$ arrow now matches $q_0$'s original arrow (fidelity 1) while $q_0$ has collapsed — the state was not copied (no-cloning theorem) and nothing went faster than light: Bob needed Alice's 2 bits.`,
    },
    params: [
      {
        key: 'theta',
        label: { id: 'Keadaan pesan', en: 'Message state' },
        options: [
          { value: 0, label: '|0⟩' },
          { value: 1, label: '|1⟩' },
          { value: 2, label: '|+⟩' },
          { value: 3, label: '|+i⟩' },
          { value: 4, label: 'θ=1.1, φ=0.7' },
        ],
      },
    ],
    steps: {
      message: {
        title: { id: 'Pesan |ψ⟩', en: 'The message |ψ⟩' },
        body: {
          id: r`$q_0$ disiapkan dengan gerbang U: $|\psi\rangle = \cos\frac\theta2|0\rangle + e^{i\varphi}\sin\frac\theta2|1\rangle$.`,
          en: r`$q_0$ is prepared with a U gate: $|\psi\rangle = \cos\frac\theta2|0\rangle + e^{i\varphi}\sin\frac\theta2|1\rangle$.`,
        },
      },
      bell: {
        title: { id: 'Pasangan Bell', en: 'Bell pair' },
        body: {
          id: r`H + CNOT membuat $|\Phi^+\rangle$ di $q_1q_2$. Panah keduanya menyusut ke nol: masing-masing sendirian acak total.`,
          en: r`H + CNOT make $|\Phi^+\rangle$ on $q_1q_2$. Both arrows shrink to zero: each alone is completely random.`,
        },
      },
      entangle: {
        title: { id: 'Alice membelitkan pesannya', en: 'Alice entangles her message' },
        body: {
          id: r`CNOT $q_0\to q_1$ lalu H pada $q_0$. Kini keempat kemungkinan hasil Alice masing-masing berpasangan dengan versi $|\psi\rangle$ yang "terputar" di $q_2$.`,
          en: r`CNOT $q_0\to q_1$ then H on $q_0$. Each of Alice's four possible outcomes is now paired with a "rotated" version of $|\psi\rangle$ on $q_2$.`,
        },
      },
      measure: {
        title: { id: 'Alice mengukur', en: 'Alice measures' },
        body: {
          id: r`Alice mengukur $q_0, q_1$ dan mengirim dua bit $c_0, c_1$ ke Bob lewat saluran klasik.`,
          en: r`Alice measures $q_0, q_1$ and sends the two bits $c_0, c_1$ to Bob over a classical channel.`,
        },
      },
      correct: {
        title: { id: 'Bob memperbaiki', en: 'Bob corrects' },
        body: {
          id: r`Bob menerapkan $X^{c_1}$ lalu $Z^{c_0}$. Apa pun hasil acak Alice, $q_2$ menjadi $|\psi\rangle$.`,
          en: r`Bob applies $X^{c_1}$ then $Z^{c_0}$. Whatever Alice's random outcome, $q_2$ ends up in $|\psi\rangle$.`,
        },
      },
    },
  },
  {
    id: 'superdense',
    title: { id: 'Superdense coding', en: 'Superdense coding' },
    summary: {
      id: 'Kirim 2 bit klasik dengan mengirim hanya 1 qubit.',
      en: 'Send 2 classical bits by transmitting just 1 qubit.',
    },
    speedup: { id: '2 bit per qubit terkirim', en: '2 bits per transmitted qubit' },
    intro: {
      id: r`Kebalikan teleportasi. Alice dan Bob berbagi $|\Phi^+\rangle$. Dengan menerapkan salah satu dari $I, X, Z, ZX$ pada qubitnya, Alice memilih satu dari empat keadaan Bell — lalu mengirim qubit itu ke Bob.`,
      en: r`The reverse of teleportation. Alice and Bob share $|\Phi^+\rangle$. By applying one of $I, X, Z, ZX$ to her qubit, Alice selects one of the four Bell states — then sends that qubit to Bob.`,
    },
    conclusion: {
      id: r`Keempat keadaan Bell saling ortogonal, jadi Bob dapat membedakannya dengan pasti dan membaca kedua bit.`,
      en: r`The four Bell states are orthogonal, so Bob can tell them apart with certainty and read both bits.`,
    },
    params: [{ key: 'bits', label: { id: 'Bit yang dikirim', en: 'Bits to send' }, options: bits(2) }],
    steps: {
      bell: {
        title: { id: 'Berbagi Φ+', en: 'Share Φ+' },
        body: {
          id: r`Pasangan $|\Phi^+\rangle = (|00\rangle+|11\rangle)/\sqrt2$.`,
          en: r`The pair $|\Phi^+\rangle = (|00\rangle+|11\rangle)/\sqrt2$.`,
        },
      },
      encode: {
        title: { id: 'Alice menyandikan', en: 'Alice encodes' },
        body: {
          id: r`X membalik bit kedua, Z membalik tanda: $00\to\Phi^+$, $01\to\Psi^+$, $10\to\Phi^-$, $11\to\Psi^-$.`,
          en: r`X flips the second bit, Z flips the sign: $00\to\Phi^+$, $01\to\Psi^+$, $10\to\Phi^-$, $11\to\Psi^-$.`,
        },
      },
      decode: {
        title: { id: 'Bob membuka', en: 'Bob decodes' },
        body: {
          id: r`CNOT lalu H memetakan basis Bell kembali ke basis komputasi: kota amplitudo tinggal satu menara.`,
          en: r`CNOT then H map the Bell basis back to the computational basis: the city is left with one tower.`,
        },
      },
      measure: {
        title: { id: 'Baca dua bit', en: 'Read two bits' },
        body: { id: 'Hasil = bit Alice.', en: 'Outcome = Alice’s bits.' },
      },
    },
  },
  {
    id: 'grover',
    title: { id: 'Pencarian Grover', en: 'Grover search' },
    summary: {
      id: 'Temukan item yang ditandai di antara N dalam ~√N langkah.',
      en: 'Find a marked item among N in ~√N steps.',
    },
    speedup: { id: 'O(√N) vs O(N)', en: 'O(√N) vs O(N)' },
    intro: {
      id: r`Satu dari $N=2^n$ keadaan ditandai oracle. Grover mengulang dua refleksi yang **memutar** keadaan menuju target sebesar $2\theta$ setiap iterasi, dengan $\sin\theta = 1/\sqrt N$. Panel geometri menampilkan rotasi itu di bidang dua dimensi.`,
      en: r`One of $N=2^n$ states is marked by an oracle. Grover repeats two reflections that **rotate** the state towards the target by $2\theta$ per iteration, where $\sin\theta = 1/\sqrt N$. The geometry panel shows that rotation in a 2D plane.`,
    },
    conclusion: {
      id: r`Setelah $\lfloor\frac\pi4\sqrt N\rfloor$ iterasi, probabilitas target $=\sin^2((2k+1)\theta)$ — hampir 1. Iterasi berlebih justru memutar melewati target.`,
      en: r`After $\lfloor\frac\pi4\sqrt N\rfloor$ iterations the target probability is $\sin^2((2k+1)\theta)$ — nearly 1. Extra iterations overshoot past the target.`,
    },
    params: [
      {
        key: 'n',
        label: { id: 'Qubit', en: 'Qubits' },
        options: [2, 3, 4].map((v) => ({ value: v, label: String(v) })),
      },
      { key: 'marked', label: { id: 'Item ditandai', en: 'Marked item' }, options: bits(4) },
    ],
    steps: {
      superpose: {
        title: { id: 'Superposisi seragam', en: 'Uniform superposition' },
        body: {
          id: r`$|s\rangle = H^{\otimes n}|0\rangle$: semua item berpeluang sama $1/N$. Vektor keadaan hampir tegak lurus terhadap target.`,
          en: r`$|s\rangle = H^{\otimes n}|0\rangle$: every item has probability $1/N$. The state vector is almost perpendicular to the target.`,
        },
      },
      oracle: {
        title: { id: 'Oracle: balik fase target', en: 'Oracle: flip the target phase' },
        body: {
          id: r`$O|x\rangle = -|x\rangle$ hanya untuk target. Menara target berganti warna (fase $\pi$) — tingginya belum berubah. Secara geometris: refleksi terhadap sumbu "bukan target".`,
          en: r`$O|x\rangle = -|x\rangle$ only for the target. The target tower changes colour (phase $\pi$) — its height does not change yet. Geometrically: a reflection about the "not target" axis.`,
        },
      },
      diffuse: {
        title: { id: 'Difusi: inversi terhadap rata-rata', en: 'Diffusion: inversion about the mean' },
        body: {
          id: r`$D = 2|s\rangle\langle s| - I$ mencerminkan setiap amplitudo terhadap rata-ratanya. Amplitudo target yang negatif melonjak naik; yang lain sedikit turun. Dua refleksi = satu rotasi sebesar $2\theta$.`,
          en: r`$D = 2|s\rangle\langle s| - I$ reflects every amplitude about the mean. The negative target amplitude shoots up; the others dip slightly. Two reflections = one rotation by $2\theta$.`,
        },
      },
    },
  },
  {
    id: 'qft',
    title: { id: 'Transformasi Fourier kuantum', en: 'Quantum Fourier transform' },
    summary: {
      id: 'DFT pada amplitudo dengan O(n²) gerbang — inti algoritma Shor.',
      en: 'A DFT on the amplitudes with O(n²) gates — the heart of Shor’s algorithm.',
    },
    speedup: { id: 'O(n²) gerbang vs O(n·2ⁿ) FFT', en: 'O(n²) gates vs O(n·2ⁿ) FFT' },
    intro: {
      id: r`QFT memetakan $|x\rangle \mapsto \frac{1}{\sqrt N}\sum_y e^{2\pi i\,xy/N}|y\rangle$. Semua menara keluaran setinggi sama — informasinya ada di **fase**, yang berputar dengan laju $x$. Roda fase menunjukkannya.`,
      en: r`The QFT maps $|x\rangle \mapsto \frac{1}{\sqrt N}\sum_y e^{2\pi i\,xy/N}|y\rangle$. All output towers are equally tall — the information lives in the **phases**, which wind at rate $x$. The phase wheels show it.`,
    },
    conclusion: {
      id: r`Fase amplitudo $|y\rangle$ adalah $2\pi xy/N$: berjalan memutari roda warna $x$ kali saat $y$ dari 0 ke $N-1$. Simulator kami cocok dengan DFT hingga $10^{-10}$ (diuji).`,
      en: r`The phase of amplitude $|y\rangle$ is $2\pi xy/N$: it winds around the colour wheel $x$ times as $y$ goes from 0 to $N-1$. Our simulator matches the DFT to $10^{-10}$ (tested).`,
    },
    params: [{ key: 'x', label: { id: 'Input x', en: 'Input x' }, options: bits(3) }],
    steps: {
      input: {
        title: { id: 'Input |x⟩', en: 'Input |x⟩' },
        body: {
          id: r`Gerbang X menyiapkan bilangan $x$ dalam biner.`,
          en: r`X gates prepare the number $x$ in binary.`,
        },
      },
      rotate: {
        title: { id: 'H + rotasi fase berkontrol', en: 'H + controlled phase rotations' },
        body: {
          id: r`Setiap qubit mendapat H lalu rotasi $R_k = \mathrm{diag}(1, e^{2\pi i/2^k})$ yang dikontrol qubit berikutnya. Qubit ini kini menyimpan satu "digit" fase $0.x_j x_{j+1}\ldots$.`,
          en: r`Each qubit gets an H then rotations $R_k = \mathrm{diag}(1, e^{2\pi i/2^k})$ controlled by later qubits. It now stores one phase "digit" $0.x_j x_{j+1}\ldots$.`,
        },
      },
      swap: {
        title: { id: 'Balik urutan', en: 'Reverse the order' },
        body: {
          id: r`SWAP membalik urutan qubit sehingga keluaran berurutan seperti DFT standar.`,
          en: r`SWAPs reverse the qubit order so the output matches the standard DFT ordering.`,
        },
      },
    },
  },
  {
    id: 'shor',
    title: { id: 'Shor mini: faktorkan 15', en: 'Mini Shor: factor 15' },
    summary: {
      id: 'Cari periode aˣ mod 15 dengan estimasi fase, lalu faktorkan secara klasik.',
      en: 'Find the period of aˣ mod 15 with phase estimation, then factor classically.',
    },
    speedup: { id: 'Eksponensial (untuk N besar)', en: 'Exponential (for large N)' },
    intro: {
      id: r`Memfaktorkan $N$ tereduksi menjadi mencari periode $r$ dari $f(x)=a^x \bmod N$. Kita memakai 4 qubit penghitung + 4 qubit kerja. Versi mini ini memakai perkalian modular yang sudah "dikompilasi" untuk $N=15$ — jujur saja, ini demonstrasi, bukan pemfaktor umum.`,
      en: r`Factoring $N$ reduces to finding the period $r$ of $f(x)=a^x \bmod N$. We use 4 counting qubits + 4 work qubits. This mini version uses modular multiplication pre-"compiled" for $N=15$ — honestly, a demonstration, not a general factoriser.`,
    },
    conclusion: {
      id: r`Puncak di $y = s\cdot 16/r$. Pecahan berlanjut $y/16 \approx s/r$ memberi $r$, lalu $\gcd(a^{r/2}\pm1, 15)$ memberi faktor $3$ dan $5$.`,
      en: r`Peaks sit at $y = s\cdot 16/r$. Continued fractions $y/16 \approx s/r$ give $r$, and $\gcd(a^{r/2}\pm1, 15)$ gives the factors $3$ and $5$.`,
    },
    params: [
      {
        key: 'a',
        label: { id: 'Basis a', en: 'Base a' },
        options: [2, 4, 7, 8, 11, 13].map((v) => ({ value: v, label: String(v) })),
      },
    ],
    steps: {
      init: {
        title: { id: 'Register kerja |1⟩', en: 'Work register |1⟩' },
        body: { id: r`Qubit kerja menyimpan $1 = a^0$.`, en: r`The work qubits hold $1 = a^0$.` },
      },
      superpose: {
        title: { id: 'Superposisi penghitung', en: 'Superpose the counter' },
        body: {
          id: r`H pada 4 qubit penghitung: semua $x\in\{0,\ldots,15\}$ sekaligus.`,
          en: r`H on the 4 counting qubits: all $x\in\{0,\ldots,15\}$ at once.`,
        },
      },
      modexp: {
        title: { id: 'Eksponensiasi modular', en: 'Modular exponentiation' },
        body: {
          id: r`Perkalian berkontrol oleh $a^{2^j} \bmod 15$ menghasilkan $\sum_x|x\rangle|a^x \bmod 15\rangle$. Register penghitung kini terbelit dengan nilai yang berulang dengan periode $r$.`,
          en: r`Controlled multiplications by $a^{2^j} \bmod 15$ produce $\sum_x|x\rangle|a^x \bmod 15\rangle$. The counter is now entangled with values that repeat with period $r$.`,
        },
      },
      iqft: {
        title: { id: 'QFT invers', en: 'Inverse QFT' },
        body: {
          id: r`QFT⁻¹ pada penghitung mengubah keteraturan berkala menjadi puncak tajam di kelipatan $16/r$.`,
          en: r`QFT⁻¹ on the counter turns the periodic structure into sharp peaks at multiples of $16/r$.`,
        },
      },
      measure: {
        title: { id: 'Ukur & olah klasik', en: 'Measure & post-process' },
        body: {
          id: r`Ukur penghitung, lalu jalankan pecahan berlanjut dan gcd di komputer biasa (panel kanan).`,
          en: r`Measure the counter, then run continued fractions and gcd on an ordinary computer (right panel).`,
        },
      },
    },
  },
];

const TELEPORT_STATES: [number, number][] = [
  [0, 0],
  [Math.PI, 0],
  [Math.PI / 2, 0],
  [Math.PI / 2, Math.PI / 2],
  [1.1, 0.7],
];

const impl: Record<string, Omit<AlgoDef, keyof AlgoText>> = {
  'deutsch-jozsa': {
    viz: 'city',
    defaults: { oracle: 0b101 },
    build: (p) =>
      deutschJozsa(
        3,
        p.oracle < 0 ? { kind: 'constant', value: p.oracle === -1 ? 0 : 1 } : { kind: 'balanced', mask: p.oracle },
      ),
    readout: () => [0, 1, 2],
  },
  'bernstein-vazirani': {
    viz: 'city',
    defaults: { secret: 0b1011 },
    build: (p) => bernsteinVazirani(4, p.secret),
    readout: () => [0, 1, 2, 3],
  },
  teleportation: {
    viz: 'bloch',
    defaults: { theta: 4 },
    build: (p) => {
      const [th, ph] = TELEPORT_STATES[p.theta] ?? TELEPORT_STATES[4];
      return teleportation(th, ph, false);
    },
  },
  superdense: {
    viz: 'city',
    defaults: { bits: 2 },
    build: (p) => superdense(((p.bits >> 1) & 1) as 0 | 1, (p.bits & 1) as 0 | 1),
    readout: () => [0, 1],
  },
  grover: {
    viz: 'grover',
    defaults: { n: 3, marked: 5 },
    build: (p) => grover(p.n, p.marked % (1 << p.n), groverIterations(p.n)),
  },
  qft: { viz: 'qft', defaults: { x: 3 }, build: (p) => qftDemo(3, p.x) },
  shor: { viz: 'shor', defaults: { a: 7 }, build: (p) => shor15(p.a) },
};

export const ALGORITHMS: AlgoDef[] = z
  .array(AlgoText)
  .parse(texts)
  .map((t) => ({ ...t, ...impl[t.id] }));

export function getAlgorithm(id: string): AlgoDef | undefined {
  return ALGORITHMS.find((a) => a.id === id);
}

/** Text for a stage key like "oracle-2" (falls back to the prefix before "-"). */
export function stepText(a: AlgoDef, stageKey: string): AlgoText['steps'][string] | undefined {
  return a.steps[stageKey] ?? a.steps[stageKey.split('-')[0]];
}
