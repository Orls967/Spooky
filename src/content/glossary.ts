import { z } from 'zod';
import { Bi } from './schema';

const r = String.raw;

const Entry = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    term: Bi,
    /** extra surface forms used by the auto-linker (case-insensitive) */
    aliases: z.object({ id: z.array(z.string()), en: z.array(z.string()) }).strict(),
    def: Bi,
    see: z.array(z.string()).default([]),
    /** route of the module where the idea is explored */
    module: z.string().optional(),
  })
  .strict();

export type GlossaryEntry = z.infer<typeof Entry>;

const RAW: z.input<typeof Entry>[] = [
  {
    slug: 'qubit',
    term: { id: 'Qubit', en: 'Qubit' },
    aliases: { id: ['qubit'], en: ['qubits'] },
    def: {
      id: r`Satuan informasi kuantum: sistem dua tingkat dengan keadaan $\alpha|0\rangle + \beta|1\rangle$, $|\alpha|^2+|\beta|^2=1$. Berbeda dengan bit, ia bisa berada dalam superposisi.`,
      en: r`The unit of quantum information: a two-level system in the state $\alpha|0\rangle + \beta|1\rangle$, $|\alpha|^2+|\beta|^2=1$. Unlike a bit, it can be in superposition.`,
    },
    see: ['superposition', 'bloch-sphere'],
    module: '/bloch',
  },
  {
    slug: 'superposition',
    term: { id: 'Superposisi', en: 'Superposition' },
    aliases: { id: ['superposisi'], en: ['superposition', 'superposed'] },
    def: {
      id: r`Kombinasi linear beberapa keadaan basis sekaligus, mis. $\tfrac{1}{\sqrt2}(|0\rangle+|1\rangle)$. Bukan "keduanya sekaligus" dalam arti klasik — amplitudonya bisa saling menguatkan atau menghapus.`,
      en: r`A linear combination of several basis states at once, e.g. $\tfrac{1}{\sqrt2}(|0\rangle+|1\rangle)$. Not "both at once" in a classical sense — the amplitudes can reinforce or cancel.`,
    },
    see: ['amplitude', 'interference'],
  },
  {
    slug: 'amplitude',
    term: { id: 'Amplitudo', en: 'Amplitude' },
    aliases: { id: ['amplitudo'], en: ['amplitudes'] },
    def: {
      id: r`Bilangan kompleks yang menyertai tiap keadaan basis. Besarnya kuadrat memberi probabilitas; argumennya adalah fase.`,
      en: r`The complex number attached to each basis state. Its squared magnitude gives the probability; its argument is the phase.`,
    },
    see: ['born-rule', 'phase'],
    module: '/composer',
  },
  {
    slug: 'phase',
    term: { id: 'Fase', en: 'Phase' },
    aliases: { id: ['fase relatif'], en: ['relative phase'] },
    def: {
      id: r`Sudut $\varphi$ pada amplitudo $|a|e^{i\varphi}$. Fase relatif antar-basis teramati lewat interferensi; di Spooky selalu ditampilkan dengan roda warna siklik.`,
      en: r`The angle $\varphi$ in an amplitude $|a|e^{i\varphi}$. Relative phases between basis states show up through interference; in Spooky they are always drawn with the cyclic colour wheel.`,
    },
    see: ['global-phase', 'interference'],
  },
  {
    slug: 'global-phase',
    term: { id: 'Fase global', en: 'Global phase' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Faktor $e^{i\alpha}$ yang mengalikan seluruh keadaan. Tidak bisa diamati sama sekali, sehingga $|\psi\rangle$ dan $-|\psi\rangle$ adalah keadaan fisik yang sama.`,
      en: r`A factor $e^{i\alpha}$ multiplying the whole state. It is completely unobservable, so $|\psi\rangle$ and $-|\psi\rangle$ are the same physical state.`,
    },
    see: ['phase'],
  },
  {
    slug: 'born-rule',
    term: { id: 'Aturan Born', en: 'Born rule' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Probabilitas memperoleh hasil $x$ saat mengukur adalah $|\langle x|\psi\rangle|^2$.`,
      en: r`The probability of outcome $x$ when measuring is $|\langle x|\psi\rangle|^2$.`,
    },
    see: ['measurement', 'amplitude'],
  },
  {
    slug: 'measurement',
    term: { id: 'Pengukuran', en: 'Measurement' },
    aliases: { id: ['mengukur', 'diukur'], en: ['measure', 'measured', 'measuring'] },
    def: {
      id: r`Membaca qubit di suatu basis. Hasilnya acak menurut aturan Born, dan keadaan **runtuh** ke basis yang terbaca.`,
      en: r`Reading a qubit in some basis. The outcome is random by the Born rule, and the state **collapses** to the basis state that was read.`,
    },
    see: ['born-rule', 'shots'],
    module: '/bloch',
  },
  {
    slug: 'shots',
    term: { id: 'Shots', en: 'Shots' },
    aliases: { id: ['shot'], en: ['shot'] },
    def: {
      id: r`Pengulangan eksperimen yang sama untuk mengumpulkan statistik hasil pengukuran. Di Spooky setiap run memakai seed sehingga bisa diulang persis.`,
      en: r`Repetitions of the same experiment to collect measurement statistics. In Spooky each run uses a seed so it can be replayed exactly.`,
    },
    see: ['measurement'],
  },
  {
    slug: 'bloch-sphere',
    term: { id: 'Bola Bloch', en: 'Bloch sphere' },
    aliases: { id: ['bola bloch'], en: ['bloch sphere', 'bloch vector'] },
    def: {
      id: r`Gambaran geometris satu qubit: keadaan murni $\cos\frac\theta2|0\rangle + e^{i\varphi}\sin\frac\theta2|1\rangle$ adalah titik di permukaan bola dengan sudut $(\theta,\varphi)$. Keadaan campuran berada di dalam bola.`,
      en: r`A geometric picture of one qubit: the pure state $\cos\frac\theta2|0\rangle + e^{i\varphi}\sin\frac\theta2|1\rangle$ is the point on the sphere at angles $(\theta,\varphi)$. Mixed states lie inside the ball.`,
    },
    see: ['qubit', 'mixed-state'],
    module: '/bloch',
  },
  {
    slug: 'gate',
    term: { id: 'Gerbang kuantum', en: 'Quantum gate' },
    aliases: { id: ['gerbang'], en: ['gate', 'gates'] },
    def: {
      id: r`Operasi uniter $U$ ($U^\dagger U = I$) pada qubit. Gerbang satu-qubit adalah rotasi bola Bloch.`,
      en: r`A unitary operation $U$ ($U^\dagger U = I$) on qubits. Single-qubit gates are rotations of the Bloch sphere.`,
    },
    see: ['unitary', 'hadamard', 'cnot'],
  },
  {
    slug: 'unitary',
    term: { id: 'Uniter', en: 'Unitary' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Matriks yang mempertahankan panjang vektor: $U^\dagger U = I$. Evolusi kuantum tertutup selalu uniter, sehingga dapat dibalik.`,
      en: r`A matrix that preserves vector length: $U^\dagger U = I$. Closed quantum evolution is always unitary, hence reversible.`,
    },
    see: ['gate'],
  },
  {
    slug: 'hadamard',
    term: { id: 'Hadamard', en: 'Hadamard' },
    aliases: { id: [], en: [] },
    def: {
      id: r`$H = \tfrac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix}$, memetakan $|0\rangle\to|+\rangle$ dan $|1\rangle\to|-\rangle$. Pembuat superposisi paling umum.`,
      en: r`$H = \tfrac{1}{\sqrt2}\begin{pmatrix}1&1\\1&-1\end{pmatrix}$, mapping $|0\rangle\to|+\rangle$ and $|1\rangle\to|-\rangle$. The most common way to create superposition.`,
    },
    see: ['superposition', 'gate'],
  },
  {
    slug: 'cnot',
    term: { id: 'CNOT', en: 'CNOT' },
    aliases: { id: [], en: [] },
    def: {
      id: r`NOT berkontrol: membalik qubit target bila qubit kontrol bernilai 1. Bersama H, ia menghasilkan keterikatan.`,
      en: r`Controlled NOT: flips the target qubit when the control is 1. Together with H it creates entanglement.`,
    },
    see: ['entanglement', 'gate'],
    module: '/composer',
  },
  {
    slug: 'entanglement',
    term: { id: 'Keterikatan', en: 'Entanglement' },
    aliases: { id: ['terbelit', 'keterbelitan', 'entanglement'], en: ['entangled'] },
    def: {
      id: r`Keadaan bersama yang tidak dapat ditulis sebagai hasil kali keadaan masing-masing, mis. $\tfrac{1}{\sqrt2}(|00\rangle+|11\rangle)$. Hasil ukurnya berkorelasi melebihi batas klasik mana pun.`,
      en: r`A joint state that cannot be written as a product of individual states, e.g. $\tfrac{1}{\sqrt2}(|00\rangle+|11\rangle)$. Its measurement outcomes are correlated beyond any classical bound.`,
    },
    see: ['bell-state', 'chsh', 'concurrence'],
    module: '/spooky',
  },
  {
    slug: 'bell-state',
    term: { id: 'Keadaan Bell', en: 'Bell state' },
    aliases: { id: ['pasangan bell'], en: ['bell pair', 'bell states'] },
    def: {
      id: r`Empat keadaan dua-qubit yang terbelit maksimal: $\Phi^\pm = \tfrac{1}{\sqrt2}(|00\rangle\pm|11\rangle)$, $\Psi^\pm = \tfrac{1}{\sqrt2}(|01\rangle\pm|10\rangle)$.`,
      en: r`The four maximally entangled two-qubit states: $\Phi^\pm = \tfrac{1}{\sqrt2}(|00\rangle\pm|11\rangle)$, $\Psi^\pm = \tfrac{1}{\sqrt2}(|01\rangle\pm|10\rangle)$.`,
    },
    see: ['entanglement'],
    module: '/spooky',
  },
  {
    slug: 'chsh',
    term: { id: 'Ketidaksamaan CHSH', en: 'CHSH inequality' },
    aliases: { id: ['chsh', 'ketidaksamaan bell'], en: ['chsh', 'bell inequality', 'bell’s inequality'] },
    def: {
      id: r`Bentuk uji ketidaksamaan Bell: teori variabel tersembunyi lokal memberi $|S|\le 2$, mekanika kuantum mencapai $2\sqrt2$ (batas Tsirelson). Dalam bentuk permainan: menang ≤75% vs ≈85,4%.`,
      en: r`A testable form of Bell’s inequality: local hidden-variable theories give $|S|\le 2$, quantum mechanics reaches $2\sqrt2$ (Tsirelson’s bound). As a game: ≤75% wins vs ≈85.4%.`,
    },
    see: ['entanglement'],
    module: '/spooky',
  },
  {
    slug: 'decoherence',
    term: { id: 'Dekoherensi', en: 'Decoherence' },
    aliases: { id: ['derau'], en: ['noise'] },
    def: {
      id: r`Hilangnya koherensi kuantum akibat interaksi dengan lingkungan. Pada bola Bloch panah menyusut ke dalam; dimodelkan dengan kanal depolarisasi, dephasing, dan peluruhan amplitudo.`,
      en: r`Loss of quantum coherence through interaction with the environment. On the Bloch sphere the arrow shrinks inward; modelled with depolarizing, dephasing and amplitude-damping channels.`,
    },
    see: ['density-matrix', 'mixed-state'],
    module: '/bloch',
  },
  {
    slug: 'density-matrix',
    term: { id: 'Matriks densitas', en: 'Density matrix' },
    aliases: { id: [], en: [] },
    def: {
      id: r`$\rho = \sum_k p_k|\psi_k\rangle\langle\psi_k|$ — deskripsi yang juga mencakup keadaan campuran. Untuk keadaan murni $\rho = |\psi\rangle\langle\psi|$.`,
      en: r`$\rho = \sum_k p_k|\psi_k\rangle\langle\psi_k|$ — a description that also covers mixed states. For a pure state $\rho = |\psi\rangle\langle\psi|$.`,
    },
    see: ['mixed-state', 'purity'],
  },
  {
    slug: 'mixed-state',
    term: { id: 'Keadaan campuran', en: 'Mixed state' },
    aliases: { id: ['campuran'], en: ['mixed'] },
    def: {
      id: r`Campuran statistik beberapa keadaan murni; tak bisa ditulis sebagai satu ket. Muncul dari derau, atau dari melihat satu bagian dari sistem yang terbelit.`,
      en: r`A statistical mixture of pure states; it cannot be written as a single ket. It arises from noise, or from looking at one part of an entangled system.`,
    },
    see: ['density-matrix', 'reduced-state'],
  },
  {
    slug: 'reduced-state',
    term: { id: 'Keadaan tereduksi', en: 'Reduced state' },
    aliases: { id: ['tereduksi'], en: ['reduced'] },
    def: {
      id: r`Keadaan satu subsistem setelah "membuang" sisanya dengan jejak parsial, $\rho_A = \mathrm{Tr}_B\,\rho$. Setiap qubit dari pasangan Bell punya $\rho_A = I/2$.`,
      en: r`The state of one subsystem after tracing out the rest, $\rho_A = \mathrm{Tr}_B\,\rho$. Each qubit of a Bell pair has $\rho_A = I/2$.`,
    },
    see: ['mixed-state', 'entanglement-entropy'],
  },
  {
    slug: 'purity',
    term: { id: 'Kemurnian', en: 'Purity' },
    aliases: { id: [], en: [] },
    def: {
      id: r`$\mathrm{Tr}\,\rho^2$: 1 untuk keadaan murni, $1/2^n$ untuk keadaan campuran maksimal.`,
      en: r`$\mathrm{Tr}\,\rho^2$: 1 for pure states, $1/2^n$ for the maximally mixed state.`,
    },
    see: ['density-matrix'],
  },
  {
    slug: 'entanglement-entropy',
    term: { id: 'Entropi keterikatan', en: 'Entanglement entropy' },
    aliases: { id: ['entropi von neumann', 'entropi'], en: ['von neumann entropy', 'entropy'] },
    def: {
      id: r`$S = -\mathrm{Tr}\,\rho_A\log_2\rho_A$ dari keadaan tereduksi. Untuk pasangan murni: 0 bit (produk) hingga 1 bit (Bell).`,
      en: r`$S = -\mathrm{Tr}\,\rho_A\log_2\rho_A$ of the reduced state. For a pure pair: 0 bits (product) up to 1 bit (Bell).`,
    },
    see: ['reduced-state', 'concurrence'],
    module: '/spooky',
  },
  {
    slug: 'concurrence',
    term: { id: 'Concurrence', en: 'Concurrence' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Ukuran keterikatan dua qubit (Wootters) yang juga berlaku untuk keadaan campuran: 0 = terpisah, 1 = Bell. Mengatur terang "benang hantu" di Spooky Action.`,
      en: r`A two-qubit entanglement measure (Wootters) that also works for mixed states: 0 = separable, 1 = Bell. It sets the brightness of the "ghost thread" in Spooky Action.`,
    },
    see: ['entanglement', 'entanglement-entropy'],
    module: '/spooky',
  },
  {
    slug: 'interference',
    term: { id: 'Interferensi', en: 'Interference' },
    aliases: { id: [], en: ['interfere'] },
    def: {
      id: r`Amplitudo dari jalur berbeda dijumlahkan: berfase sama saling menguatkan, berlawanan saling menghapus. Mesin di balik hampir semua algoritma kuantum.`,
      en: r`Amplitudes from different paths add up: in phase they reinforce, out of phase they cancel. The engine behind almost every quantum algorithm.`,
    },
    see: ['phase', 'amplitude'],
    module: '/algorithms',
  },
  {
    slug: 'oracle',
    term: { id: 'Oracle', en: 'Oracle' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Kotak hitam yang mengevaluasi fungsi $f$ secara reversibel: $|x\rangle|y\rangle\mapsto|x\rangle|y\oplus f(x)\rangle$, atau dalam bentuk fase $|x\rangle\mapsto(-1)^{f(x)}|x\rangle$.`,
      en: r`A black box evaluating a function $f$ reversibly: $|x\rangle|y\rangle\mapsto|x\rangle|y\oplus f(x)\rangle$, or in phase form $|x\rangle\mapsto(-1)^{f(x)}|x\rangle$.`,
    },
    see: ['phase-kickback'],
    module: '/algorithms',
  },
  {
    slug: 'phase-kickback',
    term: { id: 'Phase kickback', en: 'Phase kickback' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Bila target sebuah gerbang berkontrol berada di keadaan eigen, nilai eigennya "menendang balik" menjadi fase pada qubit kontrol.`,
      en: r`When the target of a controlled gate is in an eigenstate, its eigenvalue "kicks back" as a phase on the control qubit.`,
    },
    see: ['oracle'],
  },
  {
    slug: 'qft',
    term: { id: 'Transformasi Fourier kuantum', en: 'Quantum Fourier transform' },
    aliases: { id: ['qft'], en: ['qft'] },
    def: {
      id: r`$|x\rangle\mapsto\frac{1}{\sqrt N}\sum_y e^{2\pi i\,xy/N}|y\rangle$ dengan $O(n^2)$ gerbang. Inti estimasi fase dan algoritma Shor.`,
      en: r`$|x\rangle\mapsto\frac{1}{\sqrt N}\sum_y e^{2\pi i\,xy/N}|y\rangle$ using $O(n^2)$ gates. The core of phase estimation and Shor’s algorithm.`,
    },
    see: ['phase'],
    module: '/algorithms/qft',
  },
  {
    slug: 'teleportation',
    term: { id: 'Teleportasi kuantum', en: 'Quantum teleportation' },
    aliases: { id: ['teleportasi'], en: ['teleportation', 'teleport'] },
    def: {
      id: r`Memindahkan keadaan qubit memakai satu pasangan Bell dan dua bit klasik. Keadaan asal hancur — konsisten dengan teorema no-cloning.`,
      en: r`Moving a qubit state using one Bell pair and two classical bits. The original is destroyed — consistent with the no-cloning theorem.`,
    },
    see: ['no-cloning', 'bell-state'],
    module: '/algorithms/teleportation',
  },
  {
    slug: 'no-cloning',
    term: { id: 'Teorema no-cloning', en: 'No-cloning theorem' },
    aliases: { id: ['no-cloning'], en: ['no-cloning'] },
    def: {
      id: r`Tidak ada operasi uniter yang menyalin keadaan kuantum sembarang: $|\psi\rangle|0\rangle\not\mapsto|\psi\rangle|\psi\rangle$ untuk semua $|\psi\rangle$.`,
      en: r`No unitary can copy an arbitrary quantum state: $|\psi\rangle|0\rangle\not\mapsto|\psi\rangle|\psi\rangle$ for all $|\psi\rangle$.`,
    },
    see: ['teleportation'],
  },
  {
    slug: 'fidelity',
    term: { id: 'Fidelitas', en: 'Fidelity' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Kemiripan dua keadaan murni: $F = |\langle\phi|\psi\rangle|^2$, dari 0 (ortogonal) hingga 1 (identik, abaikan fase global). Puzzle diterima bila $F \ge 0{,}999$.`,
      en: r`Similarity of two pure states: $F = |\langle\phi|\psi\rangle|^2$, from 0 (orthogonal) to 1 (identical up to global phase). Puzzles accept $F \ge 0.999$.`,
    },
    see: ['global-phase'],
    module: '/puzzles',
  },
  {
    slug: 'state-vector',
    term: { id: 'State vector', en: 'State vector' },
    aliases: { id: ['vektor keadaan'], en: [] },
    def: {
      id: r`Daftar $2^n$ amplitudo kompleks yang menggambarkan $n$ qubit. Inilah yang disimulasikan Spooky — hingga 10 qubit (1024 amplitudo).`,
      en: r`The list of $2^n$ complex amplitudes describing $n$ qubits. This is what Spooky simulates — up to 10 qubits (1024 amplitudes).`,
    },
    see: ['amplitude'],
    module: '/composer',
  },
  {
    slug: 'q-sphere',
    term: { id: 'Q-sphere', en: 'Q-sphere' },
    aliases: { id: [], en: [] },
    def: {
      id: r`Visualisasi banyak qubit: setiap basis berada di bola, lintangnya sesuai jumlah bit 1 (bobot Hamming), ukuran titik = probabilitas, warna = fase.`,
      en: r`A many-qubit visualisation: each basis state sits on a sphere, its latitude given by the number of 1 bits (Hamming weight), dot size = probability, colour = phase.`,
    },
    see: ['state-vector'],
    module: '/composer',
  },
  {
    slug: 'grover',
    term: { id: 'Algoritma Grover', en: 'Grover’s algorithm' },
    aliases: { id: ['grover'], en: ['grover'] },
    def: {
      id: r`Pencarian tak terstruktur dalam $O(\sqrt N)$ kueri dengan mengulang oracle + difusi, masing-masing satu refleksi; keduanya memutar keadaan sebesar $2\theta$.`,
      en: r`Unstructured search in $O(\sqrt N)$ queries by repeating oracle + diffusion, each a reflection; together they rotate the state by $2\theta$.`,
    },
    see: ['oracle', 'interference'],
    module: '/algorithms/grover',
  },
  {
    slug: 'shor',
    term: { id: 'Algoritma Shor', en: 'Shor’s algorithm' },
    aliases: { id: ['shor'], en: ['shor'] },
    def: {
      id: r`Memfaktorkan bilangan dengan mencari periode $a^x \bmod N$ via estimasi fase dan QFT, lalu gcd klasik. Spooky menampilkan versi mini untuk $N = 15$.`,
      en: r`Factors integers by finding the period of $a^x \bmod N$ via phase estimation and the QFT, then a classical gcd. Spooky shows a mini version for $N = 15$.`,
    },
    see: ['qft'],
    module: '/algorithms/shor',
  },
];

export const GLOSSARY: GlossaryEntry[] = z.array(Entry).parse(RAW);

export function glossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.slug === slug);
}
