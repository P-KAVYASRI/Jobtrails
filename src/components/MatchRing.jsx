const COLOR = (s) => (s >= 70 ? 'text-emerald-500' : s >= 40 ? 'text-amber-500' : 'text-rose-500');

export default function MatchRing({ score, size = 104 }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${score}% match`}>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke="currentColor" className="text-slate-200 dark:text-ink-700" />
      <circle
        cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" stroke="currentColor"
        strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 50 50)"
        className={`${COLOR(score)} transition-all duration-700`}
      />
      <text x="50" y="58" textAnchor="middle" fontSize="26" fontWeight="800" className="fill-slate-800 dark:fill-slate-100">{score}%</text>
    </svg>
  );
}
