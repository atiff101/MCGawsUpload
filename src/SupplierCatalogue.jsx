import { useState, useEffect } from "react";
import "./Dashboard.css";
import { useAuth } from "react-oidc-context";
import { COUNTRIES, format } from "./cbamData";
import { listCatalogue, createDataRequest } from "./Api";
import { SHAREABLE_FIELDS } from "./sharingFields";

function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code || "";
}

// The wizard stores "yes"/"no" strings; a record round-tripped through the
// backend may come back as a real boolean. Accept both.
function usesMeasuredValues(entry) {
  return (
    entry.usingDefaultValues === "no" || entry.usingDefaultValues === false
  );
}

function headlineEmissions(entry) {
  const hasDirect =
    entry.directEmissions !== "" &&
    entry.directEmissions !== undefined &&
    entry.directEmissions !== null;
  if (usesMeasuredValues(entry) && hasDirect) {
    const total =
      Number(entry.directEmissions) + Number(entry.indirectEmissions || 0);
    return `${total.toFixed(2)} tCO₂e/t (measured)`;
  }
  return "EU default values";
}

export default function SupplierCatalogue({
  submissions = [],
  outgoing = [],
  onRequestSent,
}) {
  const auth = useAuth();
  const [mode, setMode] = useState("importer");
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const entries = await listCatalogue(auth.user?.id_token);
        if (!cancelled) setCatalogue(entries);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setCatalogue([]);
          setLoadError(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id_token]);

  const myIds = new Set(submissions.map((s) => s.installationId));

  // Already asked? Show status instead of a second Request button.
  const requestedIds = new Map(
    outgoing
      .filter((r) => r.status === "pending" || r.status === "approved")
      .map((r) => [r.installationId, r.status]),
  );

  const entries = (catalogue || []).map((e) => ({
    ...e,
    id: e.installationId,
    mine: myIds.has(e.installationId),
    requestStatus: requestedIds.get(e.installationId) || null,
  }));

  const q = query.trim().toLowerCase();
  const results =
    q === ""
      ? entries
      : entries.filter(
          (e) =>
            (e.legalName || "").toLowerCase().includes(q) ||
            (e.installationName || "").toLowerCase().includes(q) ||
            countryName(e.country).toLowerCase().includes(q) ||
            (e.cnCode || "").toLowerCase().includes(q) ||
            format(e.category || "")
              .toLowerCase()
              .includes(q),
        );

  return (
    <>
      <header className="dash-header">
        <h1 className="dash-title">Supplier catalogue</h1>
        <p className="dash-subtitle">
          {mode === "importer"
            ? "Discover CBAM-ready producers and request their verified emissions data."
            : "See how your listed installations appear to EU importers."}
        </p>
      </header>

      <div
        className="cat-toggle"
        role="tablist"
        aria-label="Catalogue view mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "importer"}
          className={`cat-toggle-btn${mode === "importer" ? " active" : ""}`}
          onClick={() => setMode("importer")}
        >
          Importer view
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "producer"}
          className={`cat-toggle-btn${mode === "producer" ? " active" : ""}`}
          onClick={() => setMode("producer")}
        >
          Producer view
        </button>
      </div>

      {mode === "importer" ? (
        <>
          <div className="cat-search">
            <input
              type="text"
              className="field-control"
              placeholder="Search by company, country, CN code or product…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search the supplier catalogue"
            />
          </div>

          {catalogue === null ? (
            <Card>
              <p className="dash-empty-title">Loading catalogue…</p>
            </Card>
          ) : loadError ? (
            <Card>
              <p className="dash-empty-title">Couldn't load the catalogue</p>
              <p className="dash-empty-text">Please try again in a moment.</p>
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <p className="dash-empty-title">
                {q === "" ? "No listed suppliers yet" : "No matching suppliers"}
              </p>
              <p className="dash-empty-text">
                {q === ""
                  ? "Installations appear here once producers opt in to the catalogue in Step 3 of the wizard."
                  : "Try a different company name, country or CN code."}
              </p>
            </Card>
          ) : (
            <div className="cat-grid">
              {results.map((entry) => (
                <div className="dash-card cat-card" key={entry.id}>
                  <div className="cat-card-head">
                    <div>
                      <div className="dash-row-title">{entry.legalName}</div>
                      <div className="dash-row-meta">
                        {entry.installationName}
                      </div>
                    </div>
                    {entry.mine && (
                      <span className="dash-badge dash-badge-shared">
                        Your installation
                      </span>
                    )}
                  </div>
                  <div className="cat-card-facts">
                    <Fact label="Country" value={countryName(entry.country)} />
                    <Fact
                      label="Product"
                      value={format(entry.category || "")}
                    />
                    <Fact label="Route" value={format(entry.route || "")} />
                    <Fact label="CN code" value={entry.cnCode} />
                    <Fact
                      label="Headline emissions"
                      value={headlineEmissions(entry)}
                    />
                  </div>
                  <div className="cat-card-actions">
                    {entry.mine ? (
                      <span className="cat-footnote">
                        You can't request your own data.
                      </span>
                    ) : entry.requestStatus === "pending" ? (
                      <span className="dash-badge dash-badge-review">
                        Request sent
                      </span>
                    ) : entry.requestStatus === "approved" ? (
                      <span className="dash-badge dash-badge-shared">
                        Access granted
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="dash-btn-primary"
                        onClick={() => setRequesting(entry)}
                      >
                        Request data
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="cat-footnote">
            Listings show headline data only. Detailed emissions data is
            released per importer, after the producer approves your request.
          </p>
        </>
      ) : (
        <ProducerView submissions={submissions} />
      )}

      {requesting && (
        <RequestModal
          entry={requesting}
          onCancel={() => setRequesting(null)}
          onSent={async () => {
            setRequesting(null);
            await onRequestSent();
          }}
        />
      )}
    </>
  );
}

// --- Request modal -----------------------------------------------------

function RequestModal({ entry, onCancel, onSent }) {
  const auth = useAuth();
  const [fields, setFields] = useState(
    () => new Set(["activityLevel", "directEmissions", "indirectEmissions"]),
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function toggle(key) {
    setFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function send() {
    setSending(true);
    setError("");
    try {
      await createDataRequest(
        {
          installationId: entry.installationId,
          requestedFields: [...fields],
          message,
        },
        auth.user?.id_token,
      );
      await onSent();
    } catch (err) {
      console.error(err);
      setError("Couldn't send the request. Please try again.");
      setSending(false);
    }
  }

  return (
    <div className="share-modal-backdrop" onMouseDown={onCancel}>
      <div
        className="share-modal dash-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="request-modal-title" className="dash-card-title">
          Request data — {entry.legalName}
        </h2>
        <p className="dash-row-meta share-modal-sub">
          {entry.installationName}
          {entry.cnCode ? ` · CN ${entry.cnCode}` : ""}
        </p>

        <div className="share-field-list">
          {SHAREABLE_FIELDS.map((f) => (
            <label key={f.key} className="share-field-item">
              <input
                type="checkbox"
                checked={fields.has(f.key)}
                onChange={() => toggle(f.key)}
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>

        <div className="share-expiry">
          <label htmlFor="request-message">Message to the producer</label>
          <textarea
            id="request-message"
            className="field-control"
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. We import under CN 7207 and need verified emissions for our Q3 CBAM declaration."
          />
        </div>

        {error && <p className="warning-text">{error}</p>}

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
            disabled={fields.size === 0 || sending}
            onClick={send}
          >
            {sending ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Producer view -----------------------------------------------------

function ProducerView({ submissions }) {
  if (!submissions || submissions.length === 0) {
    return (
      <Card>
        <p className="dash-empty-title">No installations yet</p>
        <p className="dash-empty-text">
          Register an installation first, then opt in to the catalogue from Step
          3 of the wizard.
        </p>
      </Card>
    );
  }

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <span className="dash-card-title">Your catalogue listings</span>
      </div>
      <div className="dash-list">
        {submissions.map((s, i) => {
          const listed =
            s.listedInCatalogue === true || s.listedInCatalogue === "true";
          return (
            <div className="dash-row" key={s.installationId || i}>
              <div>
                <div className="dash-row-title">
                  {s.installationName || s.legalName || "Unnamed installation"}
                </div>
                <div className="dash-row-meta">
                  {[
                    s.cnCode ? `CN ${s.cnCode}` : null,
                    countryName(s.country),
                    format(s.category || ""),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="dash-row-meta">
                  {listed
                    ? `Importers can see: company, installation, country, CN code, ${headlineEmissions(s)}`
                    : "Not visible to importers. Opt in via the catalogue checkbox in Step 3 of the wizard."}
                </div>
              </div>
              <div className="dash-row-actions">
                {listed ? (
                  <span className="dash-badge dash-badge-shared">Listed</span>
                ) : (
                  <span className="dash-badge cat-badge-unlisted">
                    Not listed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="cat-fact">
      <div className="dash-stat-label">{label}</div>
      <div className="cat-fact-value">{value || "—"}</div>
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
