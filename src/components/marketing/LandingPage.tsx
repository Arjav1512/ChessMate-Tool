import { useState } from 'react';
import {
  Upload,
  Brain,
  Target,
  BarChart3,
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '../layout/ThemeToggle';
import { useResponsive } from '../../hooks/useResponsive';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// ─── Top-level container ────────────────────────────────────────────────────

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cm-bg-base)',
        color: 'var(--cm-text-primary)',
      }}
    >
      <NavBar onSignIn={onSignIn} onGetStarted={onGetStarted} />
      <main id="main" aria-label="ChessMate marketing content">
        <Hero onGetStarted={onGetStarted} onSignIn={onSignIn} />
        <DemoSection />
        <FeaturesGrid />
        <HowItWorks />
        <ExampleAnalysis />
        <ProgressPreview />
        <FaqSection />
        <PricingSection onGetStarted={onGetStarted} />
        <FinalCTA onGetStarted={onGetStarted} />
      </main>
      <Footer />
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────

function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const { isMobile } = useResponsive();
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(12,14,18,0.72)',
        borderBottom: '1px solid var(--cm-border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: isMobile ? '14px 16px' : '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '8px' : '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            aria-hidden
            style={{
              fontSize: '20px',
              lineHeight: 1,
              color: 'var(--cm-accent)',
              filter: 'drop-shadow(0 1px 6px rgba(240,168,64,0.4))',
            }}
          >
            ♟
          </span>
          <span style={{ fontWeight: 600, fontSize: '16px', letterSpacing: '-0.2px' }}>
            Chess<span style={{ color: 'var(--cm-accent)' }}>Mate</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isMobile && (
            <>
              <NavLink href="#features">Features</NavLink>
              <NavLink href="#how-it-works">How it works</NavLink>
              <NavLink href="#faq">FAQ</NavLink>
            </>
          )}
          <ThemeToggle />
          <button
            onClick={onSignIn}
            style={ghostBtn}
          >
            Sign in
          </button>
          <button
            onClick={onGetStarted}
            style={primaryBtn}
          >
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        fontSize: '13px',
        color: 'var(--cm-text-secondary)',
        textDecoration: 'none',
        padding: '6px 10px',
        borderRadius: '6px',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--cm-text-primary)';
        e.currentTarget.style.background = 'var(--cm-bg-elevated)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--cm-text-secondary)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </a>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function Hero({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '96px 24px 80px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* Subtle glow backdrop */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-160px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '720px',
          height: '720px',
          background: 'radial-gradient(circle, rgba(240,168,64,0.18), rgba(240,168,64,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="fade-up"
        style={{
          position: 'relative',
          maxWidth: '780px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--cm-accent)',
            background: 'var(--cm-accent-dim)',
            border: '1px solid var(--cm-accent-ring)',
            padding: '5px 12px',
            borderRadius: '999px',
            marginBottom: '24px',
          }}
        >
          <Sparkles size={12} /> AI + Stockfish, built for improvement
        </span>

        <h1
          style={{
            fontSize: 'clamp(38px, 6vw, 60px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            marginBottom: '20px',
          }}
        >
          Get better at chess,{' '}
          <span style={{ color: 'var(--cm-accent)' }}>one game at a time.</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--cm-text-secondary)',
            lineHeight: 1.55,
            maxWidth: '620px',
            margin: '0 auto 32px',
          }}
        >
          Import your games, get a deep Stockfish analysis paired with an AI
          coach that explains your mistakes in plain English. Track every
          inaccuracy, blunder, and breakthrough.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={onGetStarted} style={{ ...primaryBtn, padding: '12px 22px', fontSize: '14px' }}>
            Get started free <ArrowRight size={14} />
          </button>
          <button onClick={onSignIn} style={{ ...secondaryBtn, padding: '12px 22px', fontSize: '14px' }}>
            I already have an account
          </button>
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'var(--cm-text-muted)',
          }}
        >
          Free to use • No credit card • Works in your browser
        </p>
      </div>
    </section>
  );
}

// ─── Demo section — fake board + eval gauge ────────────────────────────────

function DemoSection() {
  return (
    <section style={sectionWrap}>
      <div className="fade-up" style={sectionInner}>
        <div
          style={{
            background: 'var(--cm-bg-surface)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <DemoBoard />
            <DemoInsights />
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoBoard() {
  // Sicilian Najdorf after 6.Bg5 — a rich mid-game position.
  // Rows are rank 8 → rank 1; cols are file a → h.
  // '·' = empty, uppercase = white, lowercase = black piece symbols.
  const POSITION = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '·', '♜'],  // rank 8
    ['·', '♟', '·', '·', '♟', '♟', '♟', '♟'],  // rank 7
    ['♟', '·', '·', '♟', '·', '♞', '·', '·'],  // rank 6
    ['·', '·', '·', '·', '·', '·', '♗', '·'],  // rank 5  ← Bg5
    ['·', '·', '·', '♘', '♙', '·', '·', '·'],  // rank 4  ← Nd4, Pe4
    ['·', '·', '♘', '·', '·', '·', '·', '·'],  // rank 3  ← Nc3
    ['♙', '♙', '♙', '·', '·', '♙', '♙', '♙'],  // rank 2
    ['♖', '·', '♗', '♕', '♔', '·', '·', '♖'],  // rank 1
  ];

  // Bg5 just played (last move) → threat on Nf6
  const highlights: Record<string, string> = {
    '3-6': 'rgba(240,168,64,0.45)',  // Bg5 last move (from)
    '2-5': 'rgba(239,68,68,0.25)',   // Nf6 threatened piece
  };

  const WHITE_PIECES = new Set(['♔', '♕', '♖', '♗', '♘', '♙']);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const dark = (r + c) % 2 === 1;
      const piece = POSITION[r][c];
      const isEmpty = piece === '·';
      const isWhite = WHITE_PIECES.has(piece);
      const hl = highlights[`${r}-${c}`];

      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            aspectRatio: '1',
            background: hl ?? (dark ? 'var(--cm-board-dark)' : 'var(--cm-board-light)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!isEmpty && (
            <span
              aria-hidden
              style={{
                fontSize: 'clamp(16px, 3vw, 26px)',
                lineHeight: 1,
                color: isWhite
                  ? dark ? '#f5e8c8' : '#ede0c4'
                  : dark ? '#1c1c28' : '#2c2c3e',
                textShadow: isWhite
                  ? '0 1px 4px rgba(0,0,0,0.65)'
                  : '0 1px 3px rgba(255,255,255,0.25)',
                userSelect: 'none',
              }}
            >
              {piece}
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <div
      role="img"
      aria-label="Chess board showing Sicilian Najdorf position with AI analysis"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--cm-border-subtle)',
        maxWidth: '340px',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {cells}
    </div>
  );
}

function DemoInsights() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Pill icon={<Zap size={12} />} label="Stockfish depth 18" />
      <InsightLine value="+0.42" label="Best: Nf3" tone="good" />
      <InsightLine value="−1.1" label="Inaccuracy: a3 — pawn weakening" tone="warn" />
      <InsightLine value="−3.4" label="Blunder: Qd2?? — Black wins material" tone="bad" />
      <div
        style={{
          padding: '12px 14px',
          background: 'var(--cm-bg-elevated)',
          border: '1px solid var(--cm-border-subtle)',
          borderRadius: '10px',
          fontSize: '13px',
          color: 'var(--cm-text-secondary)',
          lineHeight: 1.55,
        }}
      >
        <span style={{ color: 'var(--cm-accent)', fontWeight: 600 }}>Coach:</span>{' '}
        After 12.Qd2 you abandon the d-file. The follow-up Nxe5 forks queen and
        knight — try 12.Bg5 instead, pinning the f6 knight.
      </div>
    </div>
  );
}

function InsightLine({ value, label, tone }: { value: string; label: string; tone: 'good' | 'warn' | 'bad' }) {
  const color =
    tone === 'good' ? 'var(--cm-success)' : tone === 'warn' ? 'var(--cm-warning)' : 'var(--cm-error)';
  const dim =
    tone === 'good' ? 'var(--cm-success-dim)' : tone === 'warn' ? 'var(--cm-warning-dim)' : 'var(--cm-error-dim)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-family-mono)',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '6px',
          background: dim,
          color,
          minWidth: '54px',
          textAlign: 'center',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--cm-text-secondary)' }}>{label}</span>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: 'var(--cm-accent-dim)',
        border: '1px solid var(--cm-accent-ring)',
        borderRadius: '999px',
        color: 'var(--cm-accent)',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────

function FeaturesGrid() {
  const items = [
    {
      icon: <Upload size={18} />,
      title: 'One-click PGN import',
      body:
        "Upload a .pgn or paste it in. We split, parse, and store every game — up to 5 MB at a time.",
    },
    {
      icon: <Brain size={18} />,
      title: 'AI coach in your pocket',
      body:
        'Ask Gemini for the move you missed, the plan you should have followed, or why your opening fizzled.',
    },
    {
      icon: <Target size={18} />,
      title: 'Mistake detection',
      body:
        'Inaccuracies, mistakes, and blunders flagged automatically — with the cleaner move highlighted.',
    },
    {
      icon: <BarChart3 size={18} />,
      title: 'Progress tracking',
      body:
        'Accuracy, win-rate, and color-split tracked over time. Spot trends instead of guessing.',
    },
    {
      icon: <Zap size={18} />,
      title: 'Real Stockfish',
      body:
        'Not a watered-down evaluator — the real engine runs in a Web Worker so the UI stays responsive.',
    },
    {
      icon: <Sparkles size={18} />,
      title: 'Personalised plan',
      body:
        'Areas-for-improvement surfaces what to drill next — based on the games you actually played.',
    },
  ];
  return (
    <section id="features" style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader
          eyebrow="Core features"
          title="Everything you need to improve."
          subtitle="No fluff. Each feature was built to answer a question a real player asks themselves after a tough game."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
          }}
        >
          {items.map((f) => (
            <div
              key={f.title}
              style={featureCard}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cm-border-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--cm-border-subtle)')}
            >
              <div
                style={{
                  display: 'inline-flex',
                  width: '34px',
                  height: '34px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9px',
                  background: 'var(--cm-accent-dim)',
                  color: 'var(--cm-accent)',
                  border: '1px solid var(--cm-accent-ring)',
                  marginBottom: '12px',
                }}
              >
                {f.icon}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--cm-text-secondary)', lineHeight: 1.55 }}>
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ───────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Import a game',
      body: 'Paste PGN text or upload a .pgn — ChessMate parses every game off the main thread.',
    },
    {
      n: '02',
      title: 'Get the analysis',
      body: 'Stockfish runs in your browser. Every move evaluated, every blunder flagged.',
    },
    {
      n: '03',
      title: 'Ask the coach',
      body: 'The AI explains what went wrong, why, and what to play instead — in plain English.',
    },
  ];
  return (
    <section id="how-it-works" style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader
          eyebrow="How it works"
          title="Three steps from upload to insight."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {steps.map((s) => (
            <div key={s.n} style={featureCard}>
              <div
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '11px',
                  color: 'var(--cm-accent)',
                  letterSpacing: '0.6px',
                  marginBottom: '10px',
                }}
              >
                STEP {s.n}
              </div>
              <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>{s.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--cm-text-secondary)', lineHeight: 1.55 }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Example analysis ──────────────────────────────────────────────────────

function ExampleAnalysis() {
  return (
    <section style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader eyebrow="Example output" title="A taste of the analysis." />
        <div
          style={{
            background: 'var(--cm-bg-surface)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '14px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <StatTile label="Accuracy" value="84%" tone="good" />
            <StatTile label="Mistakes" value="3" tone="warn" />
            <StatTile label="Blunders" value="1" tone="bad" />
            <StatTile label="Opening" value="Ruy López" />
          </div>
          <div
            style={{
              padding: '14px',
              background: 'var(--cm-bg-base)',
              border: '1px solid var(--cm-border-subtle)',
              borderRadius: '10px',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--cm-text-secondary)',
              fontFamily: 'var(--font-family-mono)',
              whiteSpace: 'pre-wrap',
            }}
          >
{`Move 12... Qd2 (−3.4)
  Best line: 12.Bg5 Nbd7 13.O-O-O — White retains
  initiative on the d-file.

  Why it matters
  Qd2 walks into Nxe5, forking the queen and the
  knight. After 13.Bxe5 Bxe5 14.Qxe5 you've traded
  away your strongest piece for nothing.

  What to drill
  Pin tactics in the centre — open-file motifs
  before committing the queen.`}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' | 'bad' }) {
  const accent =
    tone === 'good'
      ? 'var(--cm-success)'
      : tone === 'warn'
      ? 'var(--cm-warning)'
      : tone === 'bad'
      ? 'var(--cm-error)'
      : 'var(--cm-accent)';
  return (
    <div
      style={{
        padding: '14px',
        background: 'var(--cm-bg-elevated)',
        border: '1px solid var(--cm-border-subtle)',
        borderRadius: '10px',
      }}
    >
      <div style={{ fontSize: '11px', color: 'var(--cm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: accent, fontFamily: 'var(--font-family-mono)' }}>
        {value}
      </div>
    </div>
  );
}

// ─── Progress preview ───────────────────────────────────────────────────────

function ProgressPreview() {
  // Pure SVG line "rating" chart
  const points = [
    [0, 60],
    [60, 55],
    [120, 50],
    [180, 40],
    [240, 35],
    [300, 30],
    [360, 22],
  ];
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return (
    <section style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader
          eyebrow="Stay accountable"
          title="Watch your accuracy climb over time."
          subtitle="Every uploaded game updates your stats. Color-split, W/L/D, mistakes and blunders all tracked."
        />
        <div
          style={{
            background: 'var(--cm-bg-surface)',
            border: '1px solid var(--cm-border-subtle)',
            borderRadius: '14px',
            padding: '24px',
          }}
        >
          <svg viewBox="0 0 380 80" style={{ width: '100%', height: '160px' }}>
            <defs>
              <linearGradient id="lp-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--cm-accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--cm-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${path} L 360 80 L 0 80 Z`}
              fill="url(#lp-grad)"
            />
            <path d={path} stroke="var(--cm-accent)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="var(--cm-accent)" />
            ))}
          </svg>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '12px',
              marginTop: '14px',
            }}
          >
            <StatTile label="Games analyzed" value="42" />
            <StatTile label="Avg accuracy" value="78%" tone="good" />
            <StatTile label="Trend" value="↑ 6%" tone="good" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Do I need to install anything?',
    a: 'No. ChessMate runs entirely in your browser. Stockfish runs as a Web Worker, your PGNs are parsed off-thread, and nothing needs to be downloaded.',
  },
  {
    q: 'Where are my games stored?',
    a: 'In your own Supabase project, behind row-level security. Only you can read or write your games, statistics, and chat history. No third party gets a copy.',
  },
  {
    q: 'How accurate is the analysis?',
    a: 'We run real Stockfish — the same engine used by chess servers and grandmasters. You can configure analysis depth (1–20) per game.',
  },
  {
    q: 'Will the AI coach work without an API key?',
    a: 'Stockfish analysis works out of the box. The AI coach (Google Gemini) requires the chess-mentor Edge Function deployed with a GEMINI_API_KEY secret.',
  },
  {
    q: 'Can I import games from Chess.com or Lichess?',
    a: "Today you upload PGNs directly. Both sites let you export your games as PGN with a couple of clicks — paste the file in and you're done.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader eyebrow="FAQ" title="Common questions." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '760px', margin: '0 auto' }}>
          {FAQ_ITEMS.map((it, i) => (
            <button
              key={it.q}
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              style={{
                textAlign: 'left',
                width: '100%',
                background: 'var(--cm-bg-surface)',
                border: '1px solid var(--cm-border-subtle)',
                borderRadius: '10px',
                padding: '16px 18px',
                cursor: 'pointer',
                color: 'var(--cm-text-primary)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--cm-border-strong)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--cm-border-subtle)')}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{it.q}</span>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--cm-text-muted)',
                    transform: open === i ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>
              {open === i && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    color: 'var(--cm-text-secondary)',
                    lineHeight: 1.6,
                  }}
                >
                  {it.a}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────

function PricingSection({ onGetStarted }: { onGetStarted: () => void }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      highlight: false,
      cta: 'Get started',
      features: [
        'Unlimited PGN imports',
        'Full Stockfish analysis (depth 1–20)',
        '10 AI coach queries / day',
        'Stats dashboard & progress tracking',
        'Move classification (blunders, mistakes)',
        'Works in any modern browser',
      ],
    },
    {
      name: 'Pro',
      price: 'Coming soon',
      period: '',
      highlight: true,
      cta: 'Join waitlist',
      features: [
        'Everything in Free',
        'Unlimited AI coach queries',
        'Bulk analysis with batch scheduling',
        'Opening explorer & repertoire builder',
        'CSV / JSON export',
        'Priority support',
      ],
    },
    {
      name: 'Team',
      price: 'Coming soon',
      period: '',
      highlight: false,
      cta: 'Join waitlist',
      features: [
        'Everything in Pro',
        'Shared analysis boards',
        'Student & coach accounts',
        'Custom Supabase deployment',
        'Role-based access control',
        'Dedicated onboarding',
      ],
    },
  ];

  return (
    <section id="pricing" style={sectionWrap}>
      <div style={sectionInner}>
        <SectionHeader
          eyebrow="Pricing"
          title="Free to start. Built to scale."
          subtitle="Stockfish analysis, PGN imports, and progress tracking are always free. Richer features are on the roadmap."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            maxWidth: '860px',
            margin: '0 auto',
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'var(--cm-bg-surface)' : 'var(--cm-bg-elevated)',
                border: `1px solid ${plan.highlight ? 'var(--cm-accent)' : 'var(--cm-border-subtle)'}`,
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                boxShadow: plan.highlight ? '0 0 0 1px var(--cm-accent-ring)' : undefined,
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute',
                  top: '-11px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--cm-accent)',
                  color: 'var(--cm-text-inverse)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </span>
              )}

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--cm-text-primary)', lineHeight: 1.1 }}>
                  {plan.price}
                  {plan.period && (
                    <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--cm-text-muted)', marginLeft: '4px' }}>
                      / {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--cm-text-secondary)' }}>
                    <Check size={13} style={{ color: 'var(--cm-success)', flexShrink: 0, marginTop: '2px' }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={plan.name === 'Free' ? onGetStarted : undefined}
                style={{
                  padding: '10px 16px',
                  background: plan.highlight ? 'var(--cm-accent)' : 'var(--cm-bg-hover)',
                  border: `1px solid ${plan.highlight ? 'transparent' : 'var(--cm-border-default)'}`,
                  borderRadius: '8px',
                  color: plan.highlight ? 'var(--cm-text-inverse)' : 'var(--cm-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: plan.name === 'Free' ? 'pointer' : 'default',
                  opacity: plan.name !== 'Free' ? 0.6 : 1,
                  textAlign: 'center',
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────

function FinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section style={sectionWrap}>
      <div
        style={{
          ...sectionInner,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background:
              'linear-gradient(135deg, var(--cm-bg-surface), var(--cm-bg-elevated))',
            border: '1px solid var(--cm-border-default)',
            borderRadius: '16px',
            padding: '48px 24px',
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 34px)',
              fontWeight: 700,
              letterSpacing: '-0.6px',
              marginBottom: '14px',
            }}
          >
            Start analyzing your games today.
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--cm-text-secondary)',
              marginBottom: '24px',
              maxWidth: '480px',
              margin: '0 auto 24px',
            }}
          >
            Five minutes from upload to your first coached insight.
          </p>
          <button onClick={onGetStarted} style={{ ...primaryBtn, padding: '12px 24px', fontSize: '14px' }}>
            Create your free account <ArrowRight size={14} />
          </button>
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              gap: '18px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: 'var(--cm-text-muted)',
            }}
          >
            <FooterCheck>No credit card</FooterCheck>
            <FooterCheck>Open source</FooterCheck>
            <FooterCheck>Your data, your project</FooterCheck>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCheck({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <Check size={12} style={{ color: 'var(--cm-success)' }} />
      {children}
    </span>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--cm-border-subtle)',
        padding: '28px 24px',
        marginTop: '40px',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          color: 'var(--cm-text-muted)',
          fontSize: '12px',
        }}
      >
        <span>© ChessMate · Built for players who like to improve.</span>
        <span style={{ fontFamily: 'var(--font-family-mono)' }}>♟</span>
      </div>
    </footer>
  );
}

// ─── Common section helpers ────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '600px', margin: '0 auto 36px' }}>
      <div
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: 'var(--cm-accent)',
          marginBottom: '12px',
          fontWeight: 600,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: 'clamp(24px, 3.5vw, 34px)',
          fontWeight: 700,
          letterSpacing: '-0.6px',
          marginBottom: subtitle ? '12px' : 0,
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '15px',
            color: 'var(--cm-text-secondary)',
            lineHeight: 1.6,
            maxWidth: '560px',
            margin: '0 auto',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Style constants ───────────────────────────────────────────────────────

const sectionWrap: React.CSSProperties = {
  padding: '60px 24px',
};

const sectionInner: React.CSSProperties = {
  maxWidth: '1100px',
  margin: '0 auto',
};

const featureCard: React.CSSProperties = {
  background: 'var(--cm-bg-surface)',
  border: '1px solid var(--cm-border-subtle)',
  borderRadius: '12px',
  padding: '20px',
  transition: 'border-color 0.15s, transform 0.15s',
};

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  background: 'var(--cm-accent)',
  border: '1px solid transparent',
  borderRadius: '8px',
  color: 'var(--cm-text-inverse)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s, transform 0.1s',
};

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  background: 'var(--cm-bg-elevated)',
  border: '1px solid var(--cm-border-default)',
  borderRadius: '8px',
  color: 'var(--cm-text-primary)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid transparent',
  color: 'var(--cm-text-secondary)',
  fontSize: '13px',
  padding: '6px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
};
