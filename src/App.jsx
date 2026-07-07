import { useState, useEffect, useCallback } from "react";
import "./App.css";
import "./Dashboard.css";
import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";
import InstallationWizard from "./InstallationWizard";
import { listInstallations, deleteInstallation } from "./Api";

const NAV_ITEMS = [
  { id: "home", label: "Dashboard", enabled: true },
  { id: "requests", label: "Data requests", enabled: false },
  { id: "sharing", label: "Sharing", enabled: false },
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

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

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
    auth.removeUser();
    const clientId = "1rlolqp8d21rlki8q9f32jois0";
    const logoutUri = window.location.origin;
    const domain =
      "https://eu-west-2ypcn3ejah.auth.eu-west-2.amazoncognito.com";
    window.location.href = `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(
      logoutUri,
    )}`;
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
    if (!sessionStorage.getItem("loggingOut")) {
      auth.signinRedirect();
      return (
        <div className="form-wrapper">
          <p>Redirecting to sign in…</p>
        </div>
      );
    }

    return (
      <div className="form-wrapper">
        <h1>Signed out</h1>
        <p>You've been signed out.</p>
        <button
          type="button"
          className="nav-btn"
          onClick={() => {
            sessionStorage.removeItem("loggingOut");
            auth.signinRedirect();
          }}
        >
          Sign in again
        </button>
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
              onNewInstallation={startNew}
              onEdit={startEdit}
              onDelete={handleDelete}
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
