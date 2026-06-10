import { COUNTRIES, format } from "./cbamData";

export default function Dashboard({ submissions, onNewInstallation }) {
  if (!submissions || submissions.length === 0) {
    return <EmptyState onCreate={onNewInstallation} />;
  }

  const profileCount = submissions.length;
  const goodsCount = new Set(submissions.map((s) => s.cnCode).filter(Boolean))
    .size;
  const totalTonnes = submissions.reduce(
    (sum, s) => sum + (Number(s.activityLevel) || 0),
    0,
  );
  const companyName = submissions[0]?.legalName || "";

  return (
    <>
      <header className="dash-header">
        <h1 className="dash-title">
          Welcome back{companyName ? `, ${companyName}` : ""}
        </h1>
        <p className="dash-subtitle">
          Here's where your CBAM data stands and what needs your attention.
        </p>
      </header>

      <div className="dash-stats">
        <StatCard label="Installation profiles" value={profileCount} />
        <StatCard label="CBAM goods covered" value={goodsCount} />
        <StatCard
          label="Total activity"
          value={`${totalTonnes.toLocaleString()} t`}
        />
        <StatCard label="Pending data requests" value={0} muted />
      </div>

      <section className="dash-card">
        <div className="dash-card-head">
          <span className="dash-card-title">Data requests</span>
        </div>
        <div className="dash-empty-inline">
          <p className="dash-empty-title">No data requests yet</p>
          <p className="dash-empty-text">
            When EU importers request your CBAM data, they'll appear here for
            you to review and approve. (Part of the upcoming Data Sharing
            module.)
          </p>
        </div>
      </section>

      <section className="dash-card">
        <div className="dash-card-head">
          <span className="dash-card-title">My installations</span>
          <button className="dash-btn-secondary" onClick={onNewInstallation}>
            + New
          </button>
        </div>
        <div className="dash-list">
          {submissions.map((s, i) => (
            <InstallationRow key={s.id || i} s={s} />
          ))}
        </div>
      </section>

      <section className="dash-card">
        <div className="dash-card-head">
          <span className="dash-card-title">Recent activity</span>
        </div>
        <div className="dash-activity">
          {submissions
            .slice(-3)
            .reverse()
            .map((s, i) => (
              <div className="dash-activity-row" key={i}>
                <span className="dash-activity-icon">✓</span>
                <span>
                  {s.installationName || s.legalName || "Installation"} profile
                  registered
                </span>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, muted }) {
  return (
    <div className={`dash-stat${muted ? " dash-stat-muted" : ""}`}>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">{value}</div>
    </div>
  );
}

function InstallationRow({ s }) {
  const country =
    COUNTRIES.find((c) => c.code === s.country)?.name || s.country || "";
  const meta = [s.cnCode ? `CN ${s.cnCode}` : null, country, s.city]
    .filter(Boolean)
    .join(" · ");
  const tonnes = Number(s.activityLevel)
    ? `${Number(s.activityLevel).toLocaleString()} t`
    : null;

  return (
    <div className="dash-row">
      <div>
        <div className="dash-row-title">
          {s.installationName || s.legalName || "Unnamed installation"}
          {s.category ? ` — ${format(s.category)}` : ""}
        </div>
        <div className="dash-row-meta">
          {meta}
          {tonnes ? ` · ${tonnes}` : ""}
        </div>
      </div>
      <span className="dash-badge dash-badge-submitted">Submitted</span>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="dash-empty-state">
      <div className="dash-empty-card">
        <h1 className="dash-title">Register your first installation</h1>
        <p className="dash-subtitle">
          Prepare your CBAM installation data once here, then reuse and share it
          securely with EU importers — no need to re-enter it for each one.
        </p>
        <ul className="dash-empty-checklist">
          <li>✓ Company and contact details</li>
          <li>✓ Plant location and identifiers</li>
          <li>✓ Production route, CN code and activity data</li>
        </ul>
        <button className="dash-btn-primary dash-empty-btn" onClick={onCreate}>
          Create installation profile
        </button>
        <p className="dash-empty-time">Takes about 5–10 minutes</p>
      </div>
    </div>
  );
}
