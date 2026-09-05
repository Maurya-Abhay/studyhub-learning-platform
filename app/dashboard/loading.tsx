export default function DashboardLoading() {
  return (
    <div className="dashboard-loading" aria-label="Loading dashboard">
      <div className="dashboard-loading-hero" />
      <div className="dashboard-loading-kpis">
        {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
      </div>
      <div className="dashboard-loading-grid">
        <div />
        <div />
      </div>
    </div>
  );
}
