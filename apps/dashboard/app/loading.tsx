export default function Loading() {
  return <div className="loading-state" role="status" aria-label="Cargando vista"><div className="skeleton skeleton-title" /><div className="stats-grid">{[1, 2, 3, 4].map(key => <div key={key} className="skeleton skeleton-card" />)}</div><div className="skeleton skeleton-chart" /><span className="sr-only">Cargando información de demostración…</span></div>;
}
