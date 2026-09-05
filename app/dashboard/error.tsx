'use client';

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="dashboard-route-error">
      <div className="surface empty">
        <strong>Dashboard unavailable</strong>
        <p>We could not load your learning data right now.</p>
        <button type="button" className="btn primary small" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
