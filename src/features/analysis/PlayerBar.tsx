import { Avatar } from '../../components/ui/iv';

export interface PlayerBarProps {
  name: string;
  rating?: number | null;
  color: 'w' | 'b';
  clock?: string | null;
  isUser?: boolean;
}

/** Player bar (§8 board column): avatar, name, mono rating·color, clock. */
export function PlayerBar({ name, rating, color, clock, isUser }: PlayerBarProps) {
  return (
    <div className="iv-playerbar">
      <Avatar name={name} size={28} />
      <span className="iv-playerbar__name">{name}</span>
      {isUser && <span className="iv-playerbar__you">You</span>}
      <span className="iv-playerbar__meta">
        {rating != null && <span className="iv-playerbar__rating">{rating}</span>}
        <span className="iv-playerbar__color" aria-label={color === 'w' ? 'White' : 'Black'}>{color === 'w' ? '○' : '●'}</span>
      </span>
      {clock && <span className="iv-playerbar__clock">⏱ {clock}</span>}
    </div>
  );
}
