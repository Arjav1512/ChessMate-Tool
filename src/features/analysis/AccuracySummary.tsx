import { MetricCard, Skeleton } from '../../components/ui/iv';

export interface AccuracySummaryProps {
  user: number | null;
  opponent: number | null;
}

/** Accuracy summary (§8): your accuracy + delta vs opponent, opponent accuracy. */
export function AccuracySummary({ user, opponent }: AccuracySummaryProps) {
  if (user == null || opponent == null) {
    return (
      <div className="iv-aw__accuracy">
        <Skeleton height={48} /><Skeleton height={48} />
      </div>
    );
  }
  const delta = user - opponent;
  return (
    <div className="iv-aw__accuracy">
      <div className="iv-aw__accuracy-card">
        <MetricCard
          label="Your accuracy"
          value={`${user}%`}
          delta={{ value: `${Math.abs(delta)}`, direction: delta >= 0 ? 'up' : 'down' }}
          sublabel="vs opponent"
        />
      </div>
      <div className="iv-aw__accuracy-card">
        <MetricCard label="Opponent" value={`${opponent}%`} sublabel="accuracy" />
      </div>
    </div>
  );
}
