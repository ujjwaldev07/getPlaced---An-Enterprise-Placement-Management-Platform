export default function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card h-24 animate-pulse bg-slate-100/80 dark:bg-white/5" />
      ))}
    </div>
  )
}
