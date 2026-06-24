import { MetricCard } from '../../components/ui/iv';

export interface AccuracySummaryProps {
  user: number | null;
  opponent: number | null;
}

/** Accuracy summary (§8): your accuracy + delta vs opponent, opponent accuracy.
 *  Secondary/supporting — collapses (renders nothing) until accuracy is available
 *  rather than showing placeholder-looking skeleton cards (8A.1 fix). */
export function AccuracySummary({ user, opponent }: AccuracySummaryProps) {
  if (user == null || opponent == null) return null;
  const delta = user - opponent;
  return (
    <div className="iv-aw__accuracy">
      <div className="iv-aw__accuracy-card">
        <MetricCard
          label="Your accuracy"
          value={`${user}%`}
          delta={{ value: `${Math.abs(delta)}%`, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat' }}
          sublabel="vs opponent"
        />
      </div>
      <div className="iv-aw__accuracy-card">
        <MetricCard label="Opponent" value={`${opponent}%`} sublabel="accuracy" />
      </div>
    </div>
  );
}
