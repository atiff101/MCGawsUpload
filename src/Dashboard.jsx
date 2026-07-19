import { COUNTRIES, format } from "./cbamData";

const EXPIRING_SOON_DAYS = 30;

export default function Dashboard({
  submissions,
  shares = [],
  pendingRequests = 0,
  onNewInstallation,
  onEdit,
  onDelete,
}) {
  if (!submissions || submissions.length === 0) {
    return <EmptyState onCreate={onNewInstallation} />;
  }

  const profileCount = submissions.length;
  const flaggedCount = submissions.filter(
    (s) => s.checksStatus === "flagged",
  ).length;
  const totalTonnes = submissions.reduce(
    (sum, s) => sum + (Number(s.activityLevel) || 0),
    0,
  );
  const expiringSoon = shares.filter((s) => {
    if (!s.expiresAt) return false;
    const daysLeft =
      (new Date(s.expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= EXPIRING_SOON_DAYS;
  }).length;
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
        <StatCard
          label="Installations needing review"
          value={flaggedCount}
          muted={flaggedCount === 0}
        />
        <StatCard
          label="Pending data requests"
          value={pendingRequests}
          muted={pendingRequests === 0}
        />
        <StatCard
          label="Shares expiring soon"
          value={expiringSoon}
          muted={expiringSoon === 0}
        />
      </div>

      <section className="dash-card">
        <div className="dash-card-head">
          <span className="dash-card-title">Data requests</span>
        </div>
        {pendingRequests > 0 ? (
          <div className="dash-empty-inline">
            <p className="dash-empty-title">
              {pendingRequests} request{pendingRequests > 1 ? "s" : ""} awaiting
              your review
            </p>
            <p className="dash-empty-text">
              Head to the Data sharing page to review, approve or decline them.
            </p>
          </div>
        ) : (
          <div className="dash-empty-inline">
            <p className="dash-empty-title">No data requests yet</p>
            <p className="dash-empty-text">
              When EU importers request your CBAM data, they'll appear on the
              Data sharing page for you to review and approve.
            </p>
          </div>
        )}
      </section>

      <section className="dash-card">
        <div className="dash-card-head">
          <span className="dash-card-title">My installations</span>
          <button
            type="button"
            className="dash-btn-secondary"
            onClick={onNewInstallation}
          >
            + New
          </button>
        </div>
        <div className="dash-list">
          {submissions.map((s, i) => (
            <InstallationRow
              key={s.installationId || i}
              s={s}
              shares={shares}
              onEdit={onEdit}
              onDelete={onDelete}
            />
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
              <div className="dash-activity-row" key={s.installationId || i}>
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

function InstallationRow({ s, shares = [], onEdit, onDelete }) {
  const country =
    COUNTRIES.find((c) => c.code === s.country)?.name || s.country || "";
  const meta = [s.cnCode ? `CN ${s.cnCode}` : null, country, s.city]
    .filter(Boolean)
    .join(" · ");
  const tonnes = Number(s.activityLevel)
    ? `${Number(s.activityLevel).toLocaleString()} t`
    : null;
  const docCount = s.documents?.length || 0;
  const flagged = s.checksStatus === "flagged";
  const shareCount = shares.filter(
    (sh) => sh.installationId === s.installationId,
  ).length;

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
          {docCount > 0 ? ` · ${docCount} doc${docCount > 1 ? "s" : ""}` : ""}
        </div>
      </div>
      <div className="dash-row-actions">
        <span className="dash-badge dash-badge-submitted">Submitted</span>
        {shareCount > 0 && (
          <span className="dash-badge dash-badge-shared">
            Shared with {shareCount} importer{shareCount > 1 ? "s" : ""}
          </span>
        )}
        {flagged && (
          <span
            className="dash-badge dash-badge-review"
            title={(s.checksIssues || []).join("\n")}
          >
            Needs review
          </span>
        )}
        {onEdit && (
          <button
            type="button"
            className="dash-row-edit"
            onClick={() => onEdit(s)}
          >
            Edit
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="dash-row-delete"
            onClick={() => onDelete(s.installationId)}
          >
            Delete
          </button>
        )}
      </div>
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
        <button
          type="button"
          className="dash-btn-primary dash-empty-btn"
          onClick={onCreate}
        >
          Create installation profile
        </button>
        <p className="dash-empty-time">Takes about 5–10 minutes</p>
      </div>
    </div>
  );
}
