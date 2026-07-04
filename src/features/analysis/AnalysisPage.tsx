import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Tabs, TabPanel, SegmentedControl, ErrorState } from '../../components/ui/iv';
import type { Promotion } from './BoardContainer';
import { useBreakpoint } from '../../hooks/useResponsive';
import { useAnalysisStepper } from '../../stores/analysisStepperStore';
import { emptyCounts } from '../../lib/analysis/moveQuality';
import { BoardContainer } from './BoardContainer';
import { EvalBar } from '../../components/charts/EvalBar';
import { PlayerBar } from './PlayerBar';
import { BoardControls } from './BoardControls';
import { EvalTimeline } from './EvalTimeline';
import { AccuracySummary } from './AccuracySummary';
import { MoveQualityCounts } from './MoveQualityCounts';
import { InsightCard } from './InsightCard';
import { MoveList } from './MoveList';
import { LinesTab } from './LinesTab';
import { CoachTab } from './CoachTab';
import { useAnalysis } from './hooks';
import { useSendToImprove } from './sendToImprove';
import './analysis.css';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function material(fen: string, userColor: 'w' | 'b'): string {
  let w = 0, b = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = PIECE_VAL[ch.toLowerCase()];
    if (v == null) continue;
    if (ch === ch.toUpperCase()) w += v; else b += v;
  }
  const diff = userColor === 'w' ? w - b : b - w;
  return diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : 'even';
}

/** A user-explored variation branched from the current board position. */
interface Explore { baseFen: string; sans: string[] }

/** Render a variation as numbered SAN from the branch position, e.g. "12… Qd2 13. Nf3". */
function formatVariation(baseFen: string, sans: string[]): string {
  const parts = baseFen.split(' ');
  let n = Number(parts[5]) || 1;
  let whiteToMove = parts[1] !== 'b';
  let out = '';
  for (let i = 0; i < sans.length; i++) {
    if (whiteToMove) out += `${n}. ${sans[i]} `;
    else out += `${i === 0 ? `${n}… ` : ''}${sans[i]} `;
    if (!whiteToMove) n++;
    whiteToMove = !whiteToMove;
  }
  return out.trim();
}

const TABS = [
  { value: 'analysis' as const, label: 'Analysis' },
  { value: 'coach' as const, label: 'Coach' },
  { value: 'lines' as const, label: 'Lines' },
];

export function AnalysisPage() {
  const { id = 'sample' } = useParams();
  const navigate = useNavigate();
  const { width } = useBreakpoint();
  const isMobile = width < 768;
  const { game, moves, analysis } = useAnalysis(id);
  const total = moves.length;

  const currentPly = useAnalysisStepper((s) => s.currentPly);
  const orientation = useAnalysisStepper((s) => s.orientation);
  const activeTab = useAnalysisStepper((s) => s.activeTab);
  const setPly = useAnalysisStepper((s) => s.setPly);
  const flip = useAnalysisStepper((s) => s.flip);
  const setTab = useAnalysisStepper((s) => s.setTab);
  const reset = useAnalysisStepper((s) => s.reset);

  const h1Ref = useRef<HTMLHeadingElement>(null);
  // Reset on the ROUTE id so navigating between games resets even if the
  // (sample) game object is stable.
  useEffect(() => { reset(game.userColor); setExplore(null); h1Ref.current?.focus(); }, [id, game.userColor, reset]);

  const currentMove = currentPly > 0 ? moves[currentPly - 1] : null;
  const currentFen = currentMove?.fenAfter ?? moves[0]?.fenBefore ?? START_FEN;
  const lastMove = currentMove && currentMove.from ? { from: currentMove.from, to: currentMove.to } : null;
  const atStart = currentPly === 0;
  const atEnd = currentPly === total;

  // ── Lichess-style exploration: play your own moves from the shown position ──
  const [explore, setExplore] = useState<Explore | null>(null);

  // Replaying the variation gives us its end position, last move, and SAN line.
  const exploreView = useMemo(() => {
    if (!explore) return null;
    const c = new Chess();
    try { c.load(explore.baseFen); } catch { return null; }
    let last: { from: string; to: string } | null = null;
    for (const san of explore.sans) {
      const mv = c.move(san);
      if (mv) last = { from: mv.from, to: mv.to };
    }
    return { fen: c.fen(), last, line: formatVariation(explore.baseFen, explore.sans) };
  }, [explore]);

  const exploring = exploreView != null;
  const displayFen = exploreView?.fen ?? currentFen;
  const displayLastMove = exploreView?.last ?? lastMove;

  // Any jump on the real game line leaves exploration and re-syncs to the game.
  const seek = (ply: number) => { setExplore(null); setPly(ply); };

  // A legal move on the board branches (or extends) a variation.
  const onBoardMove = (from: string, to: string, promotion?: Promotion) => {
    const fromFen = exploreView?.fen ?? currentFen;
    const c = new Chess();
    try { c.load(fromFen); } catch { return; }
    let san: string | null = null;
    try { san = c.move({ from, to, promotion })?.san ?? null; } catch { san = null; }
    if (!san) return; // illegal — ignore
    const played = san;
    setExplore((prev) => prev
      ? { baseFen: prev.baseFen, sans: [...prev.sans, played] }
      : { baseFen: currentFen, sans: [played] });
  };

  const undoExplore = () => setExplore((prev) => {
    if (!prev) return null;
    const sans = prev.sans.slice(0, -1);
    return sans.length ? { baseFen: prev.baseFen, sans } : null;
  });

  const counts = useMemo(() => {
    const c = emptyCounts();
    for (const m of moves) if (m.quality) c[m.quality]++;
    return c;
  }, [moves]);
  const cleanGame = analysis.status === 'analyzed' && !moves.some((m) => m.quality === 'blunder' || m.quality === 'mistake');
  const analyzing = analysis.status === 'analyzing';

  const sendToImprove = useSendToImprove(game.id);

  // Keyboard nav (§8): ←/→ step · ↑/↓ start/end · f flip (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const t = el?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el?.isContentEditable) return;
      // Don't hijack arrow keys from widgets that consume them (tabs, segmented
      // radios) — they'd otherwise also jump the board.
      if (el?.closest('[role="tablist"],[role="radiogroup"]')) return;
      switch (e.key) {
        // While exploring, ← retraces your own variation before the game line.
        case 'ArrowLeft': e.preventDefault(); if (exploring) undoExplore(); else setPly(Math.max(0, currentPly - 1)); break;
        case 'ArrowRight': e.preventDefault(); if (!exploring) setPly(Math.min(total, currentPly + 1)); break;
        case 'ArrowUp': e.preventDefault(); seek(0); break;
        case 'ArrowDown': e.preventDefault(); seek(total); break;
        case 'f': case 'F': e.preventDefault(); flip(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // seek/undoExplore are stable closures recreated each render; deps cover their inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPly, total, setPly, flip, exploring]);

  // A real game that can't be loaded (unknown id, deleted game, or RLS denied)
  // resolves to `failed`. Show a recovered error state instead of an empty board
  // with "—" players (Phase 0 W2 — polished production states, not raw fallbacks).
  if (analysis.status === 'failed') {
    return (
      <div className="iv-page-enter" style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8) var(--space-7)' }}>
        <ErrorState
          icon={<span style={{ fontSize: 26 }} aria-hidden>♟</span>}
          title="We couldn’t open this game"
          message="This game may have been removed, or it isn’t available on your account. Head back to your library and pick another to analyze."
          onRetry={() => navigate('/games')}
          retryLabel="Back to games"
        />
      </div>
    );
  }

  const topPlayer = orientation === 'w'
    ? { name: game.black, rating: game.blackRating, color: 'b' as const, isUser: game.userColor === 'b' }
    : { name: game.white, rating: game.whiteRating, color: 'w' as const, isUser: game.userColor === 'w' };
  const bottomPlayer = orientation === 'w'
    ? { name: game.white, rating: game.whiteRating, color: 'w' as const, isUser: game.userColor === 'w' }
    : { name: game.black, rating: game.blackRating, color: 'b' as const, isUser: game.userColor === 'b' };

  const tabContent = (
    <>
      <TabPanel active={activeTab === 'analysis'}>
        <InsightCard
          move={currentMove}
          turningPoints={analysis.turningPoints}
          analyzing={analyzing}
          cleanGame={cleanGame}
          onSendToImprove={() => sendToImprove(currentMove)}
          onRevealBest={() => setTab('lines')}
          onAskCoach={() => setTab('coach')}
        />
        {/* Phase 8A: standalone CoachNote merged into the InsightCard — its inline
            "Ask coach" is the single coach entry point (one voice, not two). */}
      </TabPanel>
      <TabPanel active={activeTab === 'coach'}>
        <CoachTab game={game} move={currentMove} currentFen={displayFen} />
      </TabPanel>
      <TabPanel active={activeTab === 'lines'}>
        <LinesTab move={currentMove} analyzing={analyzing} />
      </TabPanel>
    </>
  );

  return (
    <div className={`iv-aw ${isMobile ? 'iv-aw--mobile' : ''} iv-page-enter`}>
      <h1 ref={h1Ref} tabIndex={-1} className="iv-sr-only">Game analysis — {game.white} vs {game.black}</h1>

      {/* Board column */}
      <div className="iv-aw__board-col">
        <PlayerBar {...topPlayer} />
        <div className="iv-aw__stage">
          <EvalBar
            evalCp={exploring ? null : (currentMove?.evalCp ?? null)}
            mate={exploring ? null : (currentMove?.mate ?? null)}
            indeterminate={!exploring && analyzing && currentMove != null && currentMove.evalCp == null}
          />
          <BoardContainer
            fen={displayFen}
            orientation={orientation}
            lastMove={displayLastMove}
            interactive
            onMove={onBoardMove}
          />
        </div>
        <PlayerBar {...bottomPlayer} />
        <BoardControls
          atStart={atStart && !exploring} atEnd={atEnd && !exploring}
          onStart={() => seek(0)} onPrev={() => exploring ? undoExplore() : seek(Math.max(0, currentPly - 1))}
          onNext={() => seek(Math.min(total, currentPly + 1))} onEnd={() => seek(total)}
          onFlip={flip} material={material(displayFen, game.userColor)} mobile={isMobile}
        />
        {exploring && exploreView && (
          <div className="iv-explore">
            <span className="iv-explore__label" aria-hidden>⑂ Exploring</span>
            <span className="iv-explore__line">{exploreView.line}</span>
            <span className="iv-explore__actions">
              <button type="button" className="iv-explore__btn" onClick={undoExplore}>⟲ Undo</button>
              <button type="button" className="iv-explore__btn iv-explore__btn--primary" onClick={() => setExplore(null)}>Back to game</button>
            </span>
          </div>
        )}
        <EvalTimeline moves={moves} currentPly={currentPly} turningPoints={analysis.turningPoints} onSeek={seek} />
      </div>

      {/* Analysis column */}
      <div className="iv-aw__panel">
        {isMobile
          ? <SegmentedControl ariaLabel="Analysis views" value={activeTab} onChange={setTab} options={TABS} />
          : <Tabs ariaLabel="Analysis views" value={activeTab} onChange={setTab} tabs={TABS} />}
        {/* Phase 8A: the insight leads (hero); accuracy + move-quality counts are
            demoted below it as a quiet stats caption, not a band above it. */}
        <div className="iv-aw__tabcontent">{tabContent}</div>
        <div className="iv-aw__stats">
          <AccuracySummary user={analysis.accuracyUser} opponent={analysis.accuracyOpponent} />
          <MoveQualityCounts counts={counts} />
        </div>
        <div className="iv-aw__movelist">
          <MoveList moves={moves} currentPly={currentPly} onSeek={seek} />
        </div>
      </div>
    </div>
  );
}
