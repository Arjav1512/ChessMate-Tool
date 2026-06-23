import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, EmptyState, ErrorState, MetricCard, SearchInput, SegmentedControl, Skeleton } from '../../components/ui/iv';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useGames } from './useGames';
import { filterGames, timeControlOptions } from './filterGames';
import { computeInsights } from './insights';
import { allCollections, readFavorites, toggleFavorite, addCollection, type CollectionDef } from './collections';
import { DEFAULT_FILTER, type ColorFilter, type GameFilter, type GameRowVM, type ResultFilter, type SortKey } from './types';
import './games.css';

const RESULT_GLYPH: Record<GameRowVM['outcome'], string> = { win: '✓', loss: '✕', draw: '=', unknown: '·' };

function ResultCell({ r }: { r: GameRowVM }) {
  return <span className={`iv-res iv-res--${r.outcome}`}>{r.result} {RESULT_GLYPH[r.outcome]}</span>;
}
function StatusCell({ r }: { r: GameRowVM }) {
  return (
    <span className={`iv-status iv-status--${r.status}`}>
      {r.status === 'analyzed' ? '✓ Analyzed' : '◷ Pending'}
      {r.improvements ? <span className="iv-improve-tag">▾{r.improvements}</span> : null}
    </span>
  );
}

/**
 * Game Library (System Design §4.2) — "never just a list": quick-insight strip,
 * collections, filter toolbar, status badges. Real `games` data (DEV sample
 * fallback for the unauthenticated preview). Open a game → Analysis.
 */
export function LibraryPage() {
  const navigate = useNavigate();
  const { rows, loading, loadingMore, hasMore, loadMore, error } = useGames();
  const isNarrow = useMediaQuery('(max-width: 767px)');
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { h1Ref.current?.focus(); }, []);

  const [filter, setFilter] = useState<GameFilter>(DEFAULT_FILTER);
  const [mode, setMode] = useState<'table' | 'card'>('table');
  const [collectionId, setCollectionId] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavorites());

  const [collections, setCollections] = useState(() => allCollections());
  const activeCollection = collections.find((c) => c.id === collectionId);
  const favoritesOnly = !!activeCollection?.favorites;

  const insights = useMemo(() => computeInsights(rows), [rows]);
  const tcOptions = useMemo(() => timeControlOptions(rows), [rows]);
  const shown = useMemo(() => filterGames(rows, filter, { favoritesOnly, favorites }), [rows, filter, favoritesOnly, favorites]);

  const selectCollection = (c: CollectionDef) => {
    setCollectionId(c.id);
    setFilter({ ...DEFAULT_FILTER, ...c.filter });
  };
  const openGame = (id: string) => navigate(`/analysis/${encodeURIComponent(id)}`);
  const onFav = (id: string) => setFavorites(new Set(toggleFavorite(id)));
  const saveCollection = () => {
    const name = window.prompt('Name this collection');
    if (name?.trim()) { addCollection(name.trim(), filter); setCollections(allCollections()); setCollectionId('all'); }
  };

  const useCards = isNarrow || mode === 'card';

  return (
    <div className="iv-games iv-page-enter">
      <div className="iv-games__head">
        <div>
          <h1 ref={h1Ref} tabIndex={-1} className="iv-games__title iv-h2" style={{ outline: 'none' }}>Your games</h1>
          <p className="iv-games__sub iv-body-sm">{rows.length} game{rows.length === 1 ? '' : 's'} · find any game, jump into analysis.</p>
        </div>
        <div className="iv-games__actions">
          <Button variant="ghost" disabled title="Coming soon">Connect · soon</Button>
          <Button onClick={() => navigate('/games/import')}>Import PGN →</Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <>
          <div className="iv-games__insights">{[0, 1, 2].map((i) => <Skeleton key={i} height={76} />)}</div>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={48} />)}
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<span style={{ fontSize: 26 }}>▦</span>}
          title="No games yet"
          body="Import your games to analyze them, find your patterns, and build a plan."
          action={<Button onClick={() => navigate('/games/import')}>Import your first game</Button>}
        />
      ) : (
        <>
          {/* Quick-insight strip */}
          <div className="iv-games__insights">
            <MetricCard label="Most common mistake" value={insights.mostCommonMistake ?? '—'} sublabel={insights.mostCommonMistake ? undefined : 'Analyze games to see'} />
            <MetricCard label="Best opening" value={insights.bestOpening?.name ?? '—'} sublabel={insights.bestOpening ? `${insights.bestOpening.winPct}% win · ${insights.bestOpening.games} games` : 'Need more games'} />
            <MetricCard label="Avg accuracy" value={insights.avgAccuracy != null ? `${insights.avgAccuracy}%` : '—'} sublabel={insights.avgAccuracy != null ? undefined : 'Analyze games to see'} />
          </div>

          {/* Collections */}
          <div className="iv-games__collections" role="group" aria-label="Collections">
            {collections.map((c) => (
              <button key={c.id} className={`iv-coll ${collectionId === c.id ? 'iv-coll--on' : ''}`} aria-pressed={collectionId === c.id} onClick={() => selectCollection(c)}>
                {c.name}{c.id === 'all' ? <span className="iv-coll__count">{rows.length}</span> : null}
              </button>
            ))}
            <button className="iv-coll" onClick={saveCollection}>+ New collection</button>
          </div>

          {/* Filter toolbar */}
          <div className="iv-games__toolbar">
            <span className="iv-games__search"><SearchInput aria-label="Search games" placeholder="Search opponent, opening, event…" value={filter.search} onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} /></span>
            <SegmentedControl ariaLabel="Result filter" value={filter.result} onChange={(v: ResultFilter) => setFilter((f) => ({ ...f, result: v }))}
              options={[{ value: 'all', label: 'All' }, { value: 'win', label: 'Wins' }, { value: 'loss', label: 'Losses' }, { value: 'draw', label: 'Draws' }]} />
            <SegmentedControl ariaLabel="Color filter" value={filter.color} onChange={(v: ColorFilter) => setFilter((f) => ({ ...f, color: v }))}
              options={[{ value: 'all', label: 'Any' }, { value: 'white', label: 'White' }, { value: 'black', label: 'Black' }]} />
            <Dropdown ariaLabel="Time control filter" label={filter.timeControl === 'all' ? 'Any time' : filter.timeControl} value={filter.timeControl}
              onSelect={(v) => setFilter((f) => ({ ...f, timeControl: v }))}
              items={[{ value: 'all', label: 'Any time' }, ...tcOptions.map((t) => ({ value: t, label: t }))]} />
            <Dropdown ariaLabel="Sort" label={filter.sort === 'newest' ? 'Newest' : 'Oldest'} value={filter.sort}
              onSelect={(v: SortKey) => setFilter((f) => ({ ...f, sort: v }))}
              items={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }]} />
            {!isNarrow && (
              <span className="iv-games__modes" role="group" aria-label="View mode">
                <button className={`iv-mode ${mode === 'table' ? 'iv-mode--on' : ''}`} aria-pressed={mode === 'table'} aria-label="Table view" onClick={() => setMode('table')}>▦</button>
                <button className={`iv-mode ${mode === 'card' ? 'iv-mode--on' : ''}`} aria-pressed={mode === 'card'} aria-label="Card view" onClick={() => setMode('card')}>☰</button>
              </span>
            )}
          </div>

          {/* Results */}
          {shown.length === 0 ? (
            <div className="iv-rm__nomatch" role="status">
              <p>No games match these filters.</p>
              <Button variant="ghost" onClick={() => { setFilter(DEFAULT_FILTER); setCollectionId('all'); }}>Clear filters</Button>
            </div>
          ) : useCards ? (
            <div className="iv-gcards">
              {shown.map((r) => (
                <button key={r.id} className="iv-gcard" onClick={() => openGame(r.id)} aria-label={`${r.opponent}, ${r.outcome}, ${r.opening}, ${r.status}`}>
                  <span className="iv-gcard__top"><span className="iv-gcard__opp">{r.opponent}</span> <ResultCell r={r} /></span>
                  <span className="iv-gcard__meta">{r.userColor === 'white' ? '●White' : r.userColor === 'black' ? '○Black' : '—'} · {r.opening} · {r.timeControl}</span>
                  <span className="iv-gcard__meta">{r.date} · <StatusCell r={r} /></span>
                </button>
              ))}
            </div>
          ) : (
            <table className="iv-gtable">
              <thead>
                <tr>
                  <th></th><th>Opponent</th><th>Result</th><th>Color</th><th>Opening</th><th>Time</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} tabIndex={0} onClick={() => openGame(r.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openGame(r.id); }}
                    aria-label={`${r.opponent}, ${r.outcome}, ${r.opening}, ${r.status}. Enter to open in Analysis.`}>
                    <td><button className={`iv-gtable__fav ${favorites.has(r.id) ? 'iv-gtable__fav--on' : ''}`} aria-label={favorites.has(r.id) ? 'Unfavorite' : 'Favorite'} aria-pressed={favorites.has(r.id)} onClick={(e) => { e.stopPropagation(); onFav(r.id); }}>★</button></td>
                    <td className="iv-gtable__opp">{r.opponent}</td>
                    <td><ResultCell r={r} /></td>
                    <td className="iv-gtable__meta">{r.userColor === 'white' ? '●W' : r.userColor === 'black' ? '○B' : '—'}</td>
                    <td>{r.opening}</td>
                    <td className="iv-gtable__meta">{r.timeControl}</td>
                    <td className="iv-gtable__meta">{r.date}</td>
                    <td><StatusCell r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {hasMore && <div className="iv-games__more"><Button variant="ghost" onClick={loadMore} loading={loadingMore}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}
