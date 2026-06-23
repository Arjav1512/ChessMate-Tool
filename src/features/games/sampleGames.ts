/**
 * DEV-only sample games. Production reads the real `games` table; the `?shell`
 * preview is unauthenticated, so `useGames` falls back to these in DEV to keep
 * the Library reviewable (visual gate, screenshots). Tree-shaken from prod use
 * by the `import.meta.env.DEV` guard at the call site.
 */
import type { Game } from '../../lib/supabase';

function pgn(o: { w: string; b: string; res: string; date: string; opening: string; eco: string; tc: string; event?: string }): string {
  return [
    `[Event "${o.event ?? 'Online game'}"]`,
    `[Site "chess"]`,
    `[Date "${o.date}"]`,
    `[White "${o.w}"]`,
    `[Black "${o.b}"]`,
    `[Result "${o.res}"]`,
    `[ECO "${o.eco}"]`,
    `[Opening "${o.opening}"]`,
    `[TimeControl "${o.tc}"]`,
    '',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',
  ].join('\n');
}

let _id = 0;
function game(o: { w: string; b: string; res: string; date: string; opening: string; eco: string; tc: string; color: 'white' | 'black' | null; event?: string }): Game {
  const id = `sample-${++_id}`;
  return {
    id, user_id: 'dev', pgn: pgn(o),
    white_player: o.w, black_player: o.b, result: o.res, date: o.date,
    event: o.event ?? 'Online game', user_color: o.color,
    uploaded_at: `${o.date}T12:00:00Z`, created_at: `${o.date}T12:00:00Z`,
  };
}

export const sampleGames: Game[] = [
  game({ w: 'you', b: 'M. Carlsen', res: '1-0', date: '2026-06-21', opening: 'Italian Game', eco: 'C50', tc: '600+0', color: 'white' }),
  game({ w: 'hikaru', b: 'you', res: '1-0', date: '2026-06-20', opening: 'Sicilian Najdorf', eco: 'B90', tc: '300+3', color: 'black' }),
  game({ w: 'you', b: 'a_pawn_storm', res: '1/2-1/2', date: '2026-06-18', opening: "Queen's Gambit Declined", eco: 'D37', tc: '900+10', color: 'white' }),
  game({ w: 'endgame_andy', b: 'you', res: '0-1', date: '2026-06-17', opening: 'French Defense', eco: 'C11', tc: '600+0', color: 'black' }),
  game({ w: 'you', b: 'blitz_bot', res: '0-1', date: '2026-06-15', opening: 'Ruy Lopez', eco: 'C84', tc: '180+0', color: 'white' }),
  game({ w: 'tactician_t', b: 'you', res: '1-0', date: '2026-06-14', opening: 'Caro-Kann', eco: 'B12', tc: '300+0', color: 'black' }),
  game({ w: 'you', b: 'positional_p', res: '1-0', date: '2026-06-12', opening: 'London System', eco: 'D02', tc: '1800+0', color: 'white' }),
  game({ w: 'gambit_g', b: 'you', res: '1-0', date: '2026-06-11', opening: "King's Gambit", eco: 'C33', tc: '120+1', color: 'black' }),
  game({ w: 'you', b: 'rook_rick', res: '1/2-1/2', date: '2026-06-09', opening: 'Slav Defense', eco: 'D11', tc: '600+5', color: 'white' }),
  game({ w: 'night_owl', b: 'you', res: '0-1', date: '2026-06-08', opening: 'Pirc Defense', eco: 'B07', tc: '900+10', color: 'black' }),
  game({ w: 'you', b: 'sac_sammy', res: '1-0', date: '2026-06-06', opening: 'Italian Game', eco: 'C54', tc: '300+3', color: 'white' }),
  game({ w: 'cool_hand', b: 'you', res: '1-0', date: '2026-06-05', opening: 'Scandinavian', eco: 'B01', tc: '600+0', color: 'black' }),
];

/** First 7 are "analyzed"; the rest pending (drives StatusBadge in the demo). */
export const sampleAnalyzedIds = new Set(sampleGames.slice(0, 7).map((g) => g.id));

const OPENINGS = [
  ['Italian Game', 'C50'], ['Sicilian Najdorf', 'B90'], ['Ruy Lopez', 'C84'], ['French Defense', 'C11'],
  ['Caro-Kann', 'B12'], ['London System', 'D02'], ['Slav Defense', 'D11'], ['Pirc Defense', 'B07'],
] as const;
const TCS = ['600+0', '300+3', '180+0', '900+10', '1800+0', '120+1'];
const RES = ['1-0', '0-1', '1/2-1/2'];

/** Generate N sample games for the large-library audit. */
export function makeSampleGames(n: number): Game[] {
  _id = 0;
  const out: Game[] = [];
  for (let i = 0; i < n; i++) {
    const [opening, eco] = OPENINGS[i % OPENINGS.length];
    const color = i % 2 === 0 ? 'white' : 'black';
    const day = String(28 - (i % 27)).padStart(2, '0');
    out.push(game({
      w: color === 'white' ? 'you' : `opp_${i}`,
      b: color === 'black' ? 'you' : `opp_${i}`,
      res: RES[i % RES.length], date: `2026-05-${day}`,
      opening, eco, tc: TCS[i % TCS.length], color,
    }));
  }
  return out;
}
