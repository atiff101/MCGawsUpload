import { useState, useEffect, useCallback } from "react";
import "./App.css";
import "./Dashboard.css";
import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";
import InstallationWizard from "./InstallationWizard";
import DataSharing, { isExpired } from "./DataSharing";
import SupplierCatalogue from "./SupplierCatalogue";
import {
  listInstallations,
  deleteInstallation,
  listIncomingRequests,
  listOutgoingRequests,
} from "./Api";

const NAV_ITEMS = [
  { id: "home", label: "Dashboard", enabled: true },
  { id: "catalogue", label: "Supplier catalogue", enabled: true },
  { id: "sharing", label: "Data sharing", enabled: true },
  { id: "documents", label: "Documents", enabled: false },
  { id: "company", label: "Company", enabled: false },
  { id: "settings", label: "Settings", enabled: false },
];

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState("home");
  //console.log("ID TOKEN:", auth.user?.id_token);
  // for testing
  const [submissions, setSubmissions] = useState(null);
  const [editing, setEditing] = useState(null);

  // Data sharing: requests where I'm the producer (incoming) and where I'm
  // the requester (outgoing). Both come from the API — no seeded data.
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(true);
  const [sharingError, setSharingError] = useState(false);

  const loadSubmissions = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    try {
      const records = await listInstallations(auth.user?.id_token);
      setSubmissions(records);
    } catch (err) {
      console.error(err);
      setSubmissions([]);
    }
  }, [auth.isAuthenticated, auth.user?.id_token]);

  const loadSharing = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setSharingError(false);
    try {
      const [inc, out] = await Promise.all([
        listIncomingRequests(auth.user?.id_token),
        listOutgoingRequests(auth.user?.id_token),
      ]);
      setIncoming(inc);
      setOutgoing(out);
    } catch (err) {
      console.error(err);
      setSharingError(true);
    } finally {
      setSharingLoading(false);
    }
  }, [auth.isAuthenticated, auth.user?.id_token]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    loadSharing();
  }, [loadSharing]);

  useEffect(() => {
    if (
      sessionStorage.getItem("loggingOut") &&
      !auth.isAuthenticated &&
      !auth.isLoading
    ) {
      sessionStorage.removeItem("loggingOut");
      const clientId = "1rlolqp8d21rlki8q9f32jois0";
      const domain =
        "https://eu-west-2ypcn3ejah.auth.eu-west-2.amazoncognito.com";
      const logoutUri = window.location.origin;
      window.location.assign(
        `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`,
      );
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm("Delete this installation? This can't be undone.")) {
      return;
    }
    try {
      await deleteInstallation(id, auth.user?.id_token);
      await loadSubmissions();
    } catch (err) {
      console.error(err);
      alert("Couldn't delete the installation. Please try again.");
    }
  }

  function startNew() {
    setEditing(null);
    setView("wizard");
  }
  function startEdit(record) {
    setEditing(record);
    setView("wizard");
  }
  function goHome() {
    setEditing(null);
    setView("home");
  }

  function signOut() {
    sessionStorage.setItem("loggingOut", "true");
    auth.removeUser();
  }

  if (auth.isLoading) {
    return (
      <div className="form-wrapper">
        <p>Loading…</p>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="form-wrapper">
        <p>Sign-in error: {auth.error.message}</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    if (!auth.activeNavigator && !sessionStorage.getItem("loggingOut")) {
      auth.signinRedirect();
    }
    return (
      <div className="form-wrapper">
        <p>Signing out…</p>
      </div>
    );
  }

  if (submissions === null) {
    return (
      <div className="form-wrapper">
        <p>Loading…</p>
      </div>
    );
  }

  // Derived from the same source of truth the Data sharing page uses, so the
  // dashboard badge and stat can never drift out of sync with it.
  const pendingCount = incoming.filter((r) => r.status === "pending").length;
  const activeShares = incoming.filter(
    (r) => r.status === "approved" && !isExpired(r),
  );

  return (
    <div className="dash-shell">
      <Sidebar
        view={view}
        onNavigate={setView}
        onNew={() => setView("wizard")}
        email={auth.user?.profile?.email}
        onSignOut={signOut}
      />
      <main className="dash-main">
        <div className="dash-content">
          {view === "home" ? (
            <Dashboard
              submissions={submissions}
              shares={activeShares}
              pendingRequests={pendingCount}
              onNewInstallation={startNew}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ) : view === "sharing" ? (
            <DataSharing
              incoming={incoming}
              outgoing={outgoing}
              loading={sharingLoading}
              loadError={sharingError}
              onReload={loadSharing}
            />
          ) : view === "catalogue" ? (
            <SupplierCatalogue
              submissions={submissions}
              outgoing={outgoing}
              onRequestSent={loadSharing}
            />
          ) : (
            <InstallationWizard
              key={editing?.installationId || "new"}
              existing={editing}
              onCancel={goHome}
              onSubmitted={async () => {
                await loadSubmissions();
                goHome();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ view, onNavigate, onNew, email, onSignOut }) {
  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <span className="dash-brand-logo">
          <img src="/mcg_uk_logo.jpg" alt="VUILA Connect logo" />
        </span>
        <span className="dash-brand-name">VUILA Connect</span>
      </div>
      <p className="dash-brand-sub">Producer workspace</p>

      <button type="button" className="dash-new-btn" onClick={onNew}>
        + New installation
      </button>

      <nav className="dash-nav">
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <button
              type="button"
              key={item.id}
              className={`dash-nav-item${view === item.id ? " active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ) : (
            <div key={item.id} className="dash-nav-soon" title="Coming soon">
              {item.label}
              <span className="dash-soon-pill">Soon</span>
            </div>
          ),
        )}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-user">
          <div className="dash-avatar">
            {(email || "?").charAt(0).toUpperCase()}
          </div>
          <span className="dash-user-email" title={email}>
            {email}
          </span>
        </div>
        <button type="button" className="dash-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
