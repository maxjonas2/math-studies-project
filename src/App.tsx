import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Routes, Route, NavLink, HashRouter } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Star,
  Brain,
  Sparkles,
  Sigma,
  Divide as DivideIcon,
  Dice5,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ----------------------------------------------
// Utilidades de Matemática
// ----------------------------------------------
const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return false;
  }
  return true;
};

const smallestFactor = (n: number): number | null => {
  if (n < 2) return null;
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return d;
  }
  return null; // primo
};

const primeFactors = (n: number): number[] => {
  const factors: number[] = [];
  let x = n;
  let d = 2;
  while (x >= 2 && d * d <= x) {
    while (x % d === 0) {
      factors.push(d);
      x = x / d;
    }
    d = d === 2 ? 3 : d + 2; // 2,3,5,7,...
  }
  if (x > 1) factors.push(x);
  return factors;
};

const divisibilityInfo = (n: number) => {
  const s = String(n);
  const sumDigits = s
    .split("")
    .filter((c) => /\d/.test(c))
    .reduce((a, b) => a + Number(b), 0);
  return {
    by2: n % 2 === 0,
    by3: sumDigits % 3 === 0,
    by5: n % 5 === 0,
    by6: n % 6 === 0,
    by10: n % 10 === 0,
  };
};

const normalizeFactorsInput = (text: string) => {
  const cleaned = String(text)
    .toLowerCase()
    .replace(/[×xX*·]/g, " ") // x, ×, *, ponto meio
    .replace(/[;,]/g, " ") // vírgulas e ;
    .replace(/\s+/g, " ") // múltiplos espaços
    .trim();
  if (!cleaned) return [];
  return cleaned
    .split(" ")
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n));
};

const multisetEqual = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const aa = [...a].sort((x, y) => x - y);
  const bb = [...b].sort((x, y) => x - y);
  return aa.every((v, i) => v === bb[i]);
};

const productOf = (arr: number[]) => arr.reduce((acc, v) => acc * v, 1);

// ----------------------------------------------
// Persistência (localStorage) — rastreamento simples
// ----------------------------------------------
interface Stats {
  xp: number;
  medals: string[];
  bestFiveScore: number;
  sessions: number;
  totalQuestions: number;
  correctQuestions: number;
  perTopic: Record<string, { correct: number; wrong: number }>;
  achievements: Record<string, string>;
  primeHuntCompleted: boolean;
}

const STORAGE_KEY = "mathTutorStatsV1";
const defaultStats: Stats = {
  xp: 0,
  medals: [],
  bestFiveScore: 0,
  sessions: 0,
  totalQuestions: 0,
  correctQuestions: 0,
  perTopic: {
    divisibilidade: { correct: 0, wrong: 0 },
    primos: { correct: 0, wrong: 0 },
    fatoracao: { correct: 0, wrong: 0 },
    potenciacao: { correct: 0, wrong: 0 },
    resto: { correct: 0, wrong: 0 },
  },
  achievements: {},
  primeHuntCompleted: false,
};

const loadStats = (): Stats => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? { ...defaultStats, ...JSON.parse(s) } : { ...defaultStats };
  } catch {
    return { ...defaultStats };
  }
};

const saveStats = (stats: Stats): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

const awardMedal = (stats: Stats, medalId: string): Stats => {
  if (!stats.medals.includes(medalId)) {
    stats.medals.push(medalId);
  }
  stats.achievements[medalId] = new Date().toISOString();
  return stats;
};

// ----------------------------------------------
// UI Helpers
// ----------------------------------------------
interface BadgeProps {
  children: ReactNode;
}
const Badge = ({ children }: BadgeProps) => (
  <span className='px-2 py-0.5 text-xs rounded-full bg-slate-100 border border-slate-200 text-slate-700'>
    {children}
  </span>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: ReactNode;
}
const Button = ({ className = "", children, ...props }: ButtonProps) => (
  <button
    className={
      "px-3 py-2 rounded-xl shadow-sm border bg-white hover:shadow transition-transform active:scale-95 " +
      className
    }
    {...props}
  >
    {children}
  </button>
);

interface CardProps {
  className?: string;
  children: ReactNode;
}
const Card = ({ className = "", children }: CardProps) => (
  <div className={"rounded-2xl border bg-white p-4 shadow-sm " + className}>
    {children}
  </div>
);

interface SectionTitleProps {
  icon?: React.ComponentType<{ className: string }>;
  title: string;
  subtitle?: string;
}
const SectionTitle = ({ icon: Icon, title, subtitle }: SectionTitleProps) => (
  <div className='flex items-center gap-3 mb-3'>
    <div className='p-2 rounded-xl bg-indigo-50 border border-indigo-100'>
      {Icon ? <Icon className='w-5 h-5 text-indigo-600' /> : null}
    </div>
    <div>
      <h2 className='text-lg font-semibold text-slate-800'>{title}</h2>
      {subtitle && <p className='text-sm text-slate-600'>{subtitle}</p>}
    </div>
  </div>
);

// ----------------------------------------------
// Navegação (Tabs com React Router)
// ----------------------------------------------
const Nav = () => {
  const tabs = [
    { to: "/", label: "Conceitos", icon: Brain },
    { to: "/primos", label: "Jogo dos Primos", icon: Star },
    { to: "/fatoracao", label: "Fatoração", icon: Sigma },
    { to: "/divisao", label: "Divisão Animada", icon: DivideIcon },
    { to: "/exercicios", label: "Jogo 5/5", icon: Dice5 },
    { to: "/progresso", label: "Progresso", icon: Trophy },
  ];
  return (
    <div className='sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b'>
      <div className='mx-auto max-w-6xl px-3'>
        <div className='flex items-center justify-between py-3'>
          <div className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-indigo-600' />
            <span className='font-semibold text-slate-800'>
              Aritmética+ Gamificada
            </span>
          </div>
          <nav className='flex gap-1 overflow-x-auto'>
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-sm border transition-colors whitespace-nowrap ` +
                  (isActive
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200")
                }
              >
                <span className='inline-flex items-center gap-1'>
                  <t.icon className='w-4 h-4' /> {t.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------
// Página: Conceitos (explicações + micro-interações)
// ----------------------------------------------
const ConceitosPage = () => {
  const [n, setN] = useState(12);
  const info = useMemo(() => divisibilityInfo(Number(n) || 0), [n]);
  const [primeTest, setPrimeTest] = useState(17);

  return (
    <div className='mx-auto max-w-6xl p-3 grid md:grid-cols-2 gap-4'>
      <Card>
        <SectionTitle
          icon={Brain}
          title='Divisibilidade'
          subtitle='Regras práticas e feedback visual'
        />
        <div className='space-y-3'>
          <p className='text-sm text-slate-700'>
            Um número é <strong>divisível</strong> por outro quando a divisão dá
            resultado exato (resto = 0). Veja as regras rápidas abaixo e teste
            com um número.
          </p>
          <div className='flex items-center gap-2'>
            <input
              className='border rounded-xl px-3 py-2 w-36'
              type='number'
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
            />
            <div className='flex gap-2 flex-wrap'>
              <Badge>2: {info.by2 ? "Sim" : "Não"}</Badge>
              <Badge>3: {info.by3 ? "Sim" : "Não"}</Badge>
              <Badge>5: {info.by5 ? "Sim" : "Não"}</Badge>
              <Badge>6: {info.by6 ? "Sim" : "Não"}</Badge>
              <Badge>10: {info.by10 ? "Sim" : "Não"}</Badge>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-xs text-slate-600'
          >
            Dica: Por 2 → é par. <br />
            Por 3 → some os algarismos e veja se são divisíveis por 3.
            <br />
            Por 5 → termina em 0 ou 5.{" "}
          </motion.div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={Star}
          title='Números Primos'
          subtitle='Teste rápido e casos de borda'
        />
        <div className='space-y-3'>
          <p className='text-sm text-slate-700'>
            <strong>Primos</strong> são números com apenas dois divisores: 1 e
            ele mesmo. <strong>Importante:</strong> 1 não é primo e 2 é o único
            par primo.
          </p>
          <div className='flex items-center gap-2'>
            <input
              className='border rounded-xl px-3 py-2 w-36'
              type='number'
              value={primeTest}
              onChange={(e) => setPrimeTest(Number(e.target.value))}
            />
            <Badge>{isPrime(primeTest) ? "Primo" : "Não primo"}</Badge>
          </div>
          {!isPrime(primeTest) && primeTest >= 2 && (
            <p className='text-xs text-slate-600'>
              Motivo: {primeTest} é divisível por {smallestFactor(primeTest)}.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={Sigma}
          title='Fatoração em Primos'
          subtitle='Desmontar em blocos básicos'
        />
        <p className='text-sm text-slate-700'>
          Ex.: 12 = 2 × 2 × 3. Os números primos são os “blocos de construção”
          dos números naturais.
        </p>
        <FactorizacaoMini />
      </Card>

      <Card>
        <SectionTitle
          icon={Sparkles}
          title='Potenciação'
          subtitle='Multiplicação repetida, visual e simples'
        />
        <PotenciacaoMini />
      </Card>
    </div>
  );
};

const FactorizacaoMini = () => {
  const [x, setX] = useState(36);
  const fac = useMemo(() => (x >= 2 ? primeFactors(x) : []), [x]);
  return (
    <div className='mt-2 space-y-2'>
      <div className='flex items-center gap-2'>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-36'
          value={x}
          onChange={(e) => setX(Math.max(0, Number(e.target.value)))}
        />
        <Badge>{x < 2 ? "N/A" : fac.join(" × ") || "—"}</Badge>
      </div>
      <div className='flex flex-wrap gap-2'>
        {fac.map((v, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className='px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm'
          >
            {v}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

const PotenciacaoMini = () => {
  const [base, setBase] = useState(2);
  const [exp, setExp] = useState(3);
  const val = useMemo(() => Math.pow(base, exp), [base, exp]);
  const squares = useMemo(
    () => Array.from({ length: Math.min(val, 100) }),
    [val]
  );
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-20'
          value={base}
          onChange={(e) => setBase(Number(e.target.value))}
        />
        <span className='text-slate-700'>^</span>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-20'
          value={exp}
          onChange={(e) => setExp(Number(e.target.value))}
        />
        <Badge>= {isFinite(val) ? val : "—"}</Badge>
      </div>
      <div className='grid grid-cols-10 gap-1 max-w-md'>
        {squares.slice(0, Math.min(val, 100)).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='aspect-square rounded-md bg-indigo-100 border border-indigo-200'
          />
        ))}
      </div>
      <p className='text-xs text-slate-600'>
        Visual: {base}^{exp} representa {exp} multiplicações do {base} por ele
        mesmo.
      </p>
    </div>
  );
};

// ----------------------------------------------
// Página: Jogo dos Primos (0–100)
// ----------------------------------------------
const PrimeHunt = () => {
  const [clicked, setClicked] = useState<Record<number, "correct" | "wrong">>(
    {}
  ); // { n: 'correct' | 'wrong' }
  const primes = useMemo(
    () => Array.from({ length: 101 }, (_, i) => i).filter((n) => isPrime(n)),
    []
  );
  const totalPrimes = primes.length;
  const correctCount = Object.values(clicked).filter(
    (v) => v === "correct"
  ).length;
  const [msg, setMsg] = useState<string | null>(null);
  const statsRef = useRef(loadStats());

  useEffect(() => {
    if (correctCount === totalPrimes && totalPrimes > 0) {
      const s = statsRef.current;
      s.primeHuntCompleted = true;
      awardMedal(s, "medal_caca_primos_0_100");
      s.xp += 50;
      saveStats(s);
      setMsg(
        "Parabéns! Você encontrou todos os primos até 100. Medalha conquistada!"
      );
    }
  }, [correctCount, totalPrimes]);

  const explain = (n: number) => {
    if (n < 2) return `${n} não é primo (por definição, primos começam em 2).`;
    if (n % 2 === 0 && n !== 2)
      return `${n} não é primo: é par (divisível por 2).`;
    const f = smallestFactor(n);
    return f ? `${n} não é primo: divisível por ${f}.` : `${n} é primo!`;
  };

  const onClickNumber = (n: number) => {
    setClicked((prev) => {
      if (prev[n]) return prev; // já respondeu
      const correct = isPrime(n);
      const next: Record<number, "correct" | "wrong"> = {
        ...prev,
        [n]: correct ? "correct" : "wrong",
      };
      setMsg(correct ? `${n} é primo!` : explain(n));

      // leve incremento de XP por tentativa correta
      if (correct) {
        const s = statsRef.current;
        s.xp += 2;
        saveStats(s);
      }
      return next;
    });
  };

  return (
    <div className='mx-auto max-w-6xl p-3 space-y-4'>
      <SectionTitle
        icon={Star}
        title='Jogo dos Primos (0–100)'
        subtitle='Clique apenas nos números primos. Feedback sutil e explicativo.'
      />
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-sm text-slate-700'
        >
          {msg}
        </motion.div>
      )}
      <div className='grid grid-cols-10 gap-1 select-none'>
        {Array.from({ length: 101 }, (_, n) => (
          <NumberCell
            key={n}
            n={n}
            state={clicked[n]}
            onClick={() => onClickNumber(n)}
          />
        ))}
      </div>
      <div className='text-sm text-slate-700'>
        Acertos:{" "}
        <strong
          className={correctCount === totalPrimes ? "text-emerald-600" : ""}
        >
          {correctCount}
        </strong>{" "}
        / {totalPrimes}
      </div>
    </div>
  );
};

interface NumberCellProps {
  n: number;
  state?: "correct" | "wrong";
  onClick: () => void;
}

const NumberCell = ({ n, state, onClick }: NumberCellProps) => {
  const isCorrect = state === "correct";
  const isWrong = state === "wrong";
  return (
    <motion.button
      onClick={onClick}
      initial={false}
      animate={{
        scale: isCorrect ? 1.05 : 1,
        backgroundColor: isCorrect
          ? "#dcfce7"
          : isWrong
          ? "#fee2e2"
          : "#ffffff",
      }}
      whileTap={{ scale: 0.95 }}
      className={`aspect-square w-full text-sm border rounded-xl flex items-center justify-center transition-colors ${
        isCorrect
          ? "border-emerald-300 text-emerald-800"
          : isWrong
          ? "border-rose-300 text-rose-800"
          : "border-slate-200 hover:bg-slate-50 text-slate-700"
      }`}
    >
      {n}
    </motion.button>
  );
};

// ----------------------------------------------
// Página: Fatoração Animada
// ----------------------------------------------
const FatoracaoPage = () => {
  const [n, setN] = useState(84);
  interface Step {
    value: number;
    factor: number;
    remaining: number;
  }
  const [steps, setSteps] = useState<Step[]>([]);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const buildSteps = (x: number) => {
    const arr = [];
    let v = x;
    while (v >= 2) {
      const f = smallestFactor(v);
      if (!f) {
        arr.push({ value: v, factor: v, remaining: 1 });
        break;
      } else {
        arr.push({ value: v, factor: f, remaining: v / f });
        v = v / f;
      }
      if (v === 1) break;
    }
    return arr;
  };

  useEffect(() => {
    setSteps(buildSteps(n));
    return () => clearInterval(timerRef.current);
  }, [n]);

  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
  }, [steps]);

  const startAuto = () => {
    setPlaying(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setShown((s) => {
        if (s >= steps.length) {
          clearInterval(timerRef.current);
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 800);
  };

  const stopAuto = () => {
    setPlaying(false);
    clearInterval(timerRef.current);
  };

  const statsRef = useRef(loadStats());
  useEffect(() => {
    if (shown >= steps.length && steps.length > 0) {
      const s = statsRef.current;
      s.xp += 10;
      saveStats(s);
    }
  }, [shown, steps.length]);

  return (
    <div className='mx-auto max-w-6xl p-3 space-y-4'>
      <SectionTitle
        icon={Sigma}
        title='Fatoração em Primos (Animada)'
        subtitle='Divida repetidamente pelo menor primo possível.'
      />
      <div className='flex items-center gap-2 flex-wrap'>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-40'
          value={n}
          onChange={(e) => setN(Math.max(2, Number(e.target.value)))}
        />
        <Button onClick={() => setShown((s) => Math.min(steps.length, s + 1))}>
          Próximo passo
        </Button>
        {!playing ? (
          <Button
            className='bg-indigo-600 text-zinc-800 border-indigo-600 border'
            onClick={startAuto}
          >
            Auto
          </Button>
        ) : (
          <Button
            className='bg-rose-600 text-zinc-800 border-rose-600'
            onClick={stopAuto}
          >
            Parar
          </Button>
        )}
      </div>

      <div className='grid md:grid-cols-2 gap-4'>
        <Card>
          <div className='space-y-2'>
            {steps.slice(0, shown).map((st, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-center gap-2 text-slate-800'
              >
                <span className='px-2 py-1 rounded-lg bg-slate-100 border text-sm'>
                  {st.value}
                </span>
                <span className='text-slate-500'>÷</span>
                <span className='px-2 py-1 rounded-lg bg-indigo-100 border border-indigo-200 text-sm'>
                  {st.factor}
                </span>
                <span className='text-slate-500'>→</span>
                <span className='px-2 py-1 rounded-lg bg-emerald-100 border border-emerald-200 text-sm'>
                  {st.remaining}
                </span>
              </motion.div>
            ))}
          </div>
        </Card>
        <Card>
          <p className='text-sm text-slate-700 mb-2'>Fatores primos:</p>
          <div className='flex flex-wrap gap-2'>
            {primeFactors(n)
              .slice(0, Math.max(0, shown))
              .map((f, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700'
                >
                  {f}
                </motion.span>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ----------------------------------------------
// Página: Divisão Animada (grupos de pontos)
// ----------------------------------------------
const DivisaoPage = () => {
  const [dividendo, setDividendo] = useState(13);
  const [divisor, setDivisor] = useState(4);
  const [step, setStep] = useState(0);

  const groups = useMemo(() => {
    const arr = [];
    let rest = dividendo;
    while (rest >= divisor && divisor > 0) {
      arr.push(divisor);
      rest -= divisor;
    }
    return { groups: arr.length, remainder: Math.max(0, rest) };
  }, [dividendo, divisor]);

  const shown = Math.min(step, groups.groups);

  const reset = () => setStep(0);

  return (
    <div className='mx-auto max-w-6xl p-3 space-y-4'>
      <SectionTitle
        icon={DivideIcon}
        title='Divisão Animada'
        subtitle='Forme grupos do tamanho do divisor e observe o resto.'
      />
      <div className='flex items-center gap-2 flex-wrap'>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-32'
          value={dividendo}
          onChange={(e) => setDividendo(Math.max(0, Number(e.target.value)))}
        />
        <span className='text-slate-600'>÷</span>
        <input
          type='number'
          className='border rounded-xl px-3 py-2 w-32'
          value={divisor}
          onChange={(e) => setDivisor(Math.max(1, Number(e.target.value)))}
        />
        <Button onClick={() => setStep((s) => s + 1)}>Próximo grupo</Button>
        <Button onClick={reset}>Reiniciar</Button>
      </div>

      <div className='space-y-2'>
        <p className='text-sm text-slate-700'>
          Grupos completos: <strong>{shown}</strong> | Resto:{" "}
          <strong>{Math.max(0, dividendo - shown * divisor)}</strong>
        </p>
        <div className='flex flex-wrap gap-4'>
          {Array.from({ length: shown }).map((_, gi) => (
            <motion.div
              key={gi}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='flex gap-1 bg-slate-50 border border-slate-200 p-2 rounded-xl'
            >
              {Array.from({ length: divisor }).map((_, di) => (
                <div key={di} className='w-3 h-3 rounded-full bg-slate-700' />
              ))}
            </motion.div>
          ))}
          {/* Resto visual */}
          {dividendo - shown * divisor > 0 && (
            <div className='flex items-center gap-2 text-sm text-slate-600'>
              <span>Resto:</span>
              <div className='flex gap-1'>
                {Array.from({
                  length: Math.max(0, dividendo - shown * divisor),
                }).map((_, ri) => (
                  <div key={ri} className='w-3 h-3 rounded-full bg-rose-500' />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------
// Página: Exercícios (Jogo de 5) + Gerador Aleatório
// ----------------------------------------------
const TYPES = ["divisibilidade", "primos", "fatoracao", "potenciacao", "resto"];

const generateExercise = () => {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  switch (type) {
    case "divisibilidade": {
      const n = 10 + Math.floor(Math.random() * 190);
      const by = [2, 3, 5, 10][Math.floor(Math.random() * 4)];
      const correct = n % by === 0;
      return {
        type,
        prompt: `O número ${n} é divisível por ${by}? (S/N)`,
        answer: correct ? "S" : "N",
        explain:
          by === 3
            ? `Soma dos algarismos de ${n} = ${String(n)
                .split("")
                .reduce((a, b) => a + Number(b), 0)}; ${
                correct ? "é" : "não é"
              } múltiplo de 3.`
            : `Regra prática de divisibilidade por ${by}.`,
      };
    }
    case "primos": {
      const candidates = [
        11, 12, 13, 14, 15, 16, 17, 19, 21, 23, 25, 29, 31, 33,
      ];
      const n = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        type,
        prompt: `${n} é primo? (S/N)`,
        answer: isPrime(n) ? "sim" : "não",
        explain: isPrime(n)
          ? `${n} tem apenas dois divisores (1 e ele mesmo).`
          : `${n} não é primo; menor divisor: ${smallestFactor(n) ?? "—"}.`,
      };
    }
    case "fatoracao": {
      const n = [12, 18, 20, 24, 36, 45, 50, 60][Math.floor(Math.random() * 8)];
      const expectedFactors = primeFactors(n);
      const fac = expectedFactors.join(" × ");
      return {
        type,
        value: n, // usado para validar produto
        expected: expectedFactors, // multiconjunto esperado (ordem livre)
        prompt: `Fatore ${n} em primos.`,
        answer: fac,
        explain: `Fatoração: ${fac}.`,
      };
    }
    case "potenciacao": {
      const base = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
      const exp = [2, 3, 4][Math.floor(Math.random() * 3)];
      return {
        type,
        prompt: `Calcule ${base}^${exp} (${base} elevado a ${exp}).`,
        answer: String(Math.pow(base, exp)),
        explain: `${base} multiplicado por si mesmo ${exp} vezes = ${Math.pow(
          base,
          exp
        )}`,
      };
    }
    case "resto": {
      const a = 10 + Math.floor(Math.random() * 90);
      const b = 3 + Math.floor(Math.random() * 9);
      const q = Math.floor(a / b);
      const r = a % b;
      return {
        type,
        prompt: `Em ${a} ÷ ${b}, qual é o resto?`,
        answer: String(r),
        explain: `${a} = ${b} × ${q} + ${r}.`,
      };
    }
    default:
      return {
        type: "divisibilidade",
        prompt: "Erro ao gerar",
        answer: "",
        explain: "",
      };
  }
};

const ExerciciosPage = () => {
  const [round, setRound] = useState(1);
  const [ex, setEx] = useState<any>(generateExercise());
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [score, setScore] = useState(0);
  const statsRef = useRef(loadStats());

  useEffect(() => {
    // nova sessão de 5
    if (round === 1) {
      const s = statsRef.current;
      s.sessions += 1;
      saveStats(s);
    }
  }, [round]);

  const submit = () => {
    let correct = false;
    let explain = ex.explain;
    let expected = ex.answer;

    if (ex.type === "fatoracao" && ex.value) {
      const factors = normalizeFactorsInput(input);

      if (factors.length === 0) {
        explain = "Formato aceito: 2x2x3, 2 2 3, 2,2,3 ou 2×2×3.";
      } else if (!factors.every((k) => Number.isInteger(k) && k >= 2)) {
        explain = "Use apenas inteiros ≥ 2.";
      } else if (factors.some((k) => !isPrime(k))) {
        const nonPrimes = factors.filter((k) => !isPrime(k));
        explain = `Nem todos os fatores são primos (${nonPrimes.join(
          ", "
        )}). Dica: fatorar compostos (ex.: 6 = 2x3).`;
      } else if (productOf(factors) !== ex.value) {
        const prod = productOf(factors);
        explain = `O produto dos fatores digitados é ${prod}, mas deve ser ${ex.value}.`;
      } else {
        const expectedFactors = ex.expected || primeFactors(ex.value);
        correct = multisetEqual(factors, expectedFactors);
        expected = expectedFactors.join(" × ");
        explain = correct
          ? `Perfeito! ${ex.value} = ${expected}.`
          : `Revise: ${ex.value} = ${expected}.`;
      }
    } else {
      const normalized = input.trim().toLowerCase();
      correct = normalized === ex.answer.toLowerCase();
    }

    setFeedback({ correct, explain, expected });

    const s = statsRef.current;
    s.totalQuestions += 1;
    s.perTopic[ex.type][correct ? "correct" : "wrong"] += 1;
    if (correct) {
      s.correctQuestions += 1;
      s.xp += 5;
      setScore((sc) => sc + 1);
    }
    saveStats(s);
  };

  const next = () => {
    if (round >= 5) {
      // Encerrar série de 5, dar medalhas
      const s = statsRef.current;
      s.bestFiveScore = Math.max(s.bestFiveScore, score);
      if (score === 5) awardMedal(s, "medal_perfeicao_5_de_5");
      if (score >= 4) awardMedal(s, "medal_quase_lagrimas");
      s.xp += score * 3;
      saveStats(s);
      setScore(0);
      setRound(1);
      setEx(generateExercise());
      setInput("");
      setFeedback(null);
      return;
    }
    setRound((r) => r + 1);
    setEx(generateExercise());
    setInput("");
    setFeedback(null);
  };

  return (
    <div className='mx-auto max-w-3xl p-3 space-y-4'>
      <SectionTitle
        icon={Dice5}
        title='Jogo 5/5'
        subtitle='Cinco exercícios aleatórios. Ganhe XP, medalhas e identifique pontos fracos.'
      />
      <Card>
        <div className='text-sm text-slate-600 mb-2'>
          Rodada {round} de 5 — Pontos: {score}
        </div>
        <div className='text-slate-800 mb-3'>{ex.prompt}</div>
        <div className='flex items-center gap-2'>
          <input
            className='border rounded-xl px-3 py-2 w-full'
            placeholder='Sua resposta'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button
            className='bg-indigo-600 text-zinc-800 border-indigo-600'
            onClick={submit}
          >
            Responder
          </Button>
        </div>
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-3 text-sm flex items-start gap-2 ${
                feedback.correct ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {feedback.correct ? (
                <CheckCircle2 className='w-4 h-4 mt-0.5' />
              ) : (
                <XCircle className='w-4 h-4 mt-0.5' />
              )}
              <div>
                {feedback.correct
                  ? "Correto!"
                  : `Incorreto. Resposta esperada: ${String(
                      feedback.expected
                    ).toUpperCase()}.`}
                <div className='text-slate-600 mt-1'>{feedback.explain}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className='mt-4 flex items-center gap-2'>
          <Button onClick={next}>Próximo</Button>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={Sparkles}
          title='Gerador de Exercícios (Livre)'
          subtitle='Crie novos exercícios a qualquer hora.'
        />
        <GeneratorPreview />
      </Card>
    </div>
  );
};

const GeneratorPreview = () => {
  const [items, setItems] = useState(() =>
    Array.from({ length: 3 }, generateExercise)
  );
  return (
    <div className='space-y-2'>
      {items.map((ex, i) => (
        <div key={i} className='text-sm text-slate-700 border rounded-xl p-3'>
          <div className='font-medium text-slate-800'>{ex.prompt}</div>
          <div className='text-slate-600 mt-1'>Gabarito: {ex.answer}</div>
          <div className='text-slate-500 text-xs mt-1'>{ex.explain}</div>
        </div>
      ))}
      <Button onClick={() => setItems((arr) => [generateExercise(), ...arr])}>
        Gerar mais
      </Button>
    </div>
  );
};

// ----------------------------------------------
// Página: Progresso (dashboard simples)
// ----------------------------------------------
const ProgressoPage = () => {
  const [stats, setStats] = useState(loadStats());
  useEffect(() => {
    const i = setInterval(() => setStats(loadStats()), 1000);
    return () => clearInterval(i);
  }, []);

  const data = useMemo(() => {
    const pt = stats.perTopic;
    return Object.keys(pt).map((k) => ({
      topico: k,
      Acertos: pt[k].correct,
      Erros: pt[k].wrong,
    }));
  }, [stats]);

  return (
    <div className='mx-auto max-w-6xl p-3 space-y-4'>
      <SectionTitle
        icon={Trophy}
        title='Progresso'
        subtitle='Resumo simples; pronto para virar um dashboard completo no futuro.'
      />
      <div className='grid md:grid-cols-2 gap-4'>
        <Card>
          <div className='text-sm text-slate-700'>XP total: {stats.xp}</div>
          <div className='text-sm text-slate-700'>
            Sessões: {stats.sessions}
          </div>
          <div className='text-sm text-slate-700'>
            Questões: {stats.correctQuestions}/{stats.totalQuestions}
          </div>
          <div className='text-sm text-slate-700'>
            Melhor placar 5/5: {stats.bestFiveScore}
          </div>
          <div className='mt-2'>
            <div className='text-sm text-slate-700 mb-1'>Medalhas:</div>
            <div className='flex flex-wrap gap-2'>
              {stats.medals.length === 0 && <Badge>Nenhuma ainda</Badge>}
              {stats.medals.map((m) => (
                <motion.span
                  key={m}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='px-2 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs'
                >
                  {m}
                </motion.span>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <div className='h-60'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='topico' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='Acertos' />
                <Bar dataKey='Erros' />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          icon={Brain}
          title='Próximos passos'
          subtitle='Pontos fortes, fracos e recomendações automáticas (futuro).'
        />
        <p className='text-sm text-slate-700'>
          Este painel pode evoluir para sugerir exercícios sob medida com base
          no histórico (armazenado localmente). Por ora, use os gráficos e
          contagens para identificar tópicos com mais erros.
        </p>
      </Card>
    </div>
  );
};

// ----------------------------------------------
// App Principal
// ----------------------------------------------
export default function App() {
  return (
    <HashRouter>
      <div className='min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800'>
        <Nav />
        <Routes>
          <Route path='/' element={<ConceitosPage />} />
          <Route path='/primos' element={<PrimeHunt />} />
          <Route path='/fatoracao' element={<FatoracaoPage />} />
          <Route path='/divisao' element={<DivisaoPage />} />
          <Route path='/exercicios' element={<ExerciciosPage />} />
          <Route path='/progresso' element={<ProgressoPage />} />
        </Routes>
        <footer className='mx-auto max-w-6xl px-3 py-8 text-xs text-slate-500'>
          Feito para ensino rápido e intuitivo: divisibilidade, primos,
          fatoração, potenciação e divisão com resto.
        </footer>
      </div>
    </HashRouter>
  );
}
