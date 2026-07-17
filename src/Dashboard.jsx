import { useState } from "react";
import "./Dashboard.css";
import { useAuth } from "react-oidc-context";
import { decideRequest } from "./Api";
import { SHAREABLE_FIELDS, fieldLabel } from "./sharingFields";

export default function DataSharing({
  incoming,
  outgoing,
  loading,
  loadError,
  onReload,
}) {
  const auth = useAuth();
  const [tab, setTab] = useState("incoming");
  const [reviewing, setReviewing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const pending = incoming.filter((r) => r.status === "pending");
  const active = incoming.filter(
    (r) => r.status === "approved" && !isExpired(r),
  );

  async function decide(request, payload) {
    setBusyId(request.requestId);
    try {
      await decideRequest(request.requestId, payload, auth.user?.id_token);
      await onReload();
      setReviewing(null);
    } catch (err) {
      console.error(err);
      alert("Couldn't update that request. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function declineRequest(req) {
    if (!window.confirm(`Decline the request from ${req.requesterName}?`))
      return;
    decide(req, { decision: "decline" });
  }

  function revokeShare(req) {
    if (
      !window.confirm(
        `Revoke ${req.requesterName}'s access? They will no longer be able to view your data.`,
      )
    )
      return;
    decide(req, { decision: "revoke" });
  }

  return (
    <>
      <header className="dash-header">
        <h1 className="dash-title">Data sharing</h1>
        <p className="dash-subtitle">
          Review importer requests and control exactly what each importer can
          see, and until when. Nothing is released without your approval.
        </p>
      </header>

      <div className="dash-stats">
        <Stat
          label="Pending requests"
          value={pending.length}
          muted={!pending.length}
        />
        <Stat
          label="Active shares"
          value={active.length}
          muted={!active.length}
        />
        <Stat
          label="My requests sent"
          value={outgoing.length}
          muted={!outgoing.length}
        />
      </div>

      <div className="cat-toggle" role="tablist" aria-label="Data sharing view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "incoming"}
          className={`cat-toggle-btn${tab === "incoming" ? " active" : ""}`}
          onClick={() => setTab("incoming")}
        >
          Requests for my data
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "outgoing"}
          className={`cat-toggle-btn${tab === "outgoing" ? " active" : ""}`}
          onClick={() => setTab("outgoing")}
        >
          My requests
        </button>
      </div>

      {loading ? (
        <Card>
          <p className="dash-empty-title">Loading…</p>
        </Card>
      ) : loadError ? (
        <Card>
          <p className="dash-empty-title">Couldn't load your data sharing</p>
          <p className="dash-empty-text">Please try again in a moment.</p>
        </Card>
      ) : tab === "incoming" ? (
        <>
          <section className="dash-card">
            <div className="dash-card-head">
              <span className="dash-card-title">Incoming data requests</span>
            </div>
            {pending.length === 0 ? (
              <div className="dash-empty-inline">
                <p className="dash-empty-title">No pending requests</p>
                <p className="dash-empty-text">
                  When an EU importer requests access to your installation data,
                  it will appear here for you to review, approve or decline.
                </p>
              </div>
            ) : (
              <div className="dash-list">
                {pending.map((req) => (
                  <div
                    className="dash-row share-request-row"
                    key={req.requestId}
                  >
                    <div>
                      <div className="dash-row-title">
                        {req.requesterName}
                        <span className="dash-badge dash-badge-review share-badge-gap">
                          Awaiting review
                        </span>
                      </div>
                      <div className="dash-row-meta">
                        {req.installationName}
                        {req.cnCode ? ` · CN ${req.cnCode}` : ""} · requested{" "}
                        {shortDate(req.createdAt)}
                      </div>
                      {req.message && (
                        <p className="share-request-msg">“{req.message}”</p>
                      )}
                      <div className="dash-row-meta">
                        Requested:{" "}
                        {(req.requestedFields || []).map(fieldLabel).join(", ")}
                      </div>
                    </div>
                    <div className="dash-row-actions">
                      <button
                        type="button"
                        className="dash-btn-secondary"
                        disabled={busyId === req.requestId}
                        onClick={() => setReviewing(req)}
                      >
                        Review & approve
                      </button>
                      <button
                        type="button"
                        className="dash-row-delete"
                        disabled={busyId === req.requestId}
                        onClick={() => declineRequest(req)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="dash-card">
            <div className="dash-card-head">
              <span className="dash-card-title">Active shares</span>
            </div>
            {active.length === 0 ? (
              <div className="dash-empty-inline">
                <p className="dash-empty-title">No active shares</p>
                <p className="dash-empty-text">
                  Approved importers appear here with the exact fields they can
                  access and the expiry date of the grant.
                </p>
              </div>
            ) : (
              <div className="dash-list">
                {active.map((s) => (
                  <div className="dash-row" key={s.requestId}>
                    <div>
                      <div className="dash-row-title">{s.requesterName}</div>
                      <div className="dash-row-meta">
                        {s.installationName} · granted {shortDate(s.decidedAt)}{" "}
                        · expires {s.expiresAt}
                      </div>
                      <div className="dash-row-meta">
                        Can see:{" "}
                        {(s.grantedFields || []).map(fieldLabel).join(", ")}
                      </div>
                    </div>
                    <div className="dash-row-actions">
                      <span className="dash-badge dash-badge-submitted">
                        Active
                      </span>
                      <button
                        type="button"
                        className="dash-row-delete"
                        disabled={busyId === s.requestId}
                        onClick={() => revokeShare(s)}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-title">Requests I've sent</span>
          </div>
          {outgoing.length === 0 ? (
            <div className="dash-empty-inline">
              <p className="dash-empty-title">You haven't requested any data</p>
              <p className="dash-empty-text">
                Browse the Supplier catalogue to find producers and request
                their emissions data.
              </p>
            </div>
          ) : (
            <div className="dash-list">
              {outgoing.map((r) => (
                <div className="dash-row" key={r.requestId}>
                  <div>
                    <div className="dash-row-title">{r.installationName}</div>
                    <div className="dash-row-meta">
                      {r.cnCode ? `CN ${r.cnCode} · ` : ""}sent{" "}
                      {shortDate(r.createdAt)}
                      {r.status === "approved"
                        ? ` · expires ${r.expiresAt}`
                        : ""}
                    </div>
                    <div className="dash-row-meta">
                      {r.status === "approved"
                        ? `Granted: ${(r.grantedFields || []).map(fieldLabel).join(", ")}`
                        : `Requested: ${(r.requestedFields || []).map(fieldLabel).join(", ")}`}
                    </div>
                  </div>
                  <div className="dash-row-actions">
                    <StatusBadge request={r} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {reviewing && (
        <ApproveModal
          request={reviewing}
          busy={busyId === reviewing.requestId}
          onCancel={() => setReviewing(null)}
          onApprove={(grantedFields, expiresAt) =>
            decide(reviewing, { decision: "approve", grantedFields, expiresAt })
          }
        />
      )}
    </>
  );
}

// --- Approve modal -----------------------------------------------------

function ApproveModal({ request, busy, onCancel, onApprove }) {
  const requested = request.requestedFields || [];
  const [granted, setGranted] = useState(() => new Set(requested));
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });

  function toggle(key) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const valid = granted.size > 0 && expiresAt !== "";

  return (
    <div className="share-modal-backdrop" onMouseDown={onCancel}>
      <div
        className="share-modal dash-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="share-modal-title" className="dash-card-title">
          Approve request — {request.requesterName}
        </h2>
        <p className="dash-row-meta share-modal-sub">
          {request.installationName}
          {request.cnCode ? ` · CN ${request.cnCode}` : ""}
        </p>

        <div className="share-field-list">
          {SHAREABLE_FIELDS.map((f) => (
            <label key={f.key} className="share-field-item">
              <input
                type="checkbox"
                checked={granted.has(f.key)}
                onChange={() => toggle(f.key)}
              />
              <span>
                {f.label}
                {!requested.includes(f.key) ? " — not requested" : ""}
              </span>
            </label>
          ))}
        </div>

        <div className="share-expiry">
          <label htmlFor="share-expiry-input">Access expires *</label>
          <input
            id="share-expiry-input"
            type="date"
            className="field-control"
            value={expiresAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="dash-empty-text share-expiry-hint">
            The importer loses access automatically after this date. You can
            revoke earlier at any time.
          </p>
        </div>

        <div className="share-modal-actions">
          <button
            type="button"
            className="dash-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dash-btn-primary"
            disabled={!valid || busy}
            onClick={() => onApprove([...granted], expiresAt)}
          >
            {busy ? "Granting…" : "Grant access"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- bits --------------------------------------------------------------

function StatusBadge({ request }) {
  if (request.status === "pending")
    return <span className="dash-badge dash-badge-review">Awaiting reply</span>;
  if (request.status === "declined")
    return <span className="dash-badge cat-badge-unlisted">Declined</span>;
  if (request.status === "revoked")
    return <span className="dash-badge cat-badge-unlisted">Revoked</span>;
  if (request.status === "approved" && isExpired(request))
    return <span className="dash-badge cat-badge-unlisted">Expired</span>;
  if (request.status === "approved")
    return <span className="dash-badge dash-badge-shared">Approved</span>;
  return null;
}

function Stat({ label, value, muted }) {
  return (
    <div className={`dash-stat${muted ? " dash-stat-muted" : ""}`}>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">{value}</div>
    </div>
  );
}

function Card({ children }) {
  return (
    <section className="dash-card">
      <div className="dash-empty-inline">{children}</div>
    </section>
  );
}

export function isExpired(request) {
  if (!request.expiresAt) return false;
  return new Date(request.expiresAt) < new Date(new Date().toDateString());
}

function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
