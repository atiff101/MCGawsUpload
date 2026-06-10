import { useState, useEffect, useCallback } from "react";
import "./App.css";
import "./Dashboard.css";
import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";
import InstallationWizard from "./InstallationWizard";

const API_URL =
  "https://qq3a849d72.execute-api.eu-west-2.amazonaws.com/installations";

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState("home");
  const [submissions, setSubmissions] = useState(null);

  const loadSubmissions = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${auth.user?.id_token}` },
      });
      const records = await res.json();
      setSubmissions(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error(err);
      setSubmissions([]);
    }
  }, [auth.isAuthenticated, auth.user?.id_token]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  function signOut() {
    auth.removeUser();
    const clientId = "si5elr7j05ieqh9svljdcvjul";
    const logoutUri = window.location.origin;
    const domain =
      "https://eu-west-2vcb7bfxtg.auth.eu-west-2.amazoncognito.com";
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
    return (
      <div className="form-wrapper">
        <h1>Sign in</h1>
        <p>Please sign in to access your VUILA Connect workspace.</p>
        <button className="nav-btn" onClick={() => auth.signinRedirect()}>
          Sign in
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
              onNewInstallation={() => setView("wizard")}
            />
          ) : (
            <InstallationWizard
              onCancel={() => setView("home")}
              onSubmitted={async () => {
                await loadSubmissions();
                setView("home");
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ view, onNavigate, onNew, email, onSignOut }) {
  const navItems = [
    { id: "home", label: "Dashboard", enabled: true },
    { id: "requests", label: "Data requests", enabled: false },
    { id: "sharing", label: "Sharing", enabled: false },
    { id: "documents", label: "Documents", enabled: false },
    { id: "company", label: "Company", enabled: false },
    { id: "settings", label: "Settings", enabled: false },
  ];

  return (
    <aside className="dash-sidebar">
      <div className="dash-brand">
        <span className="dash-brand-logo">V</span>
        <span className="dash-brand-name">VUILA Connect</span>
      </div>
      <p className="dash-brand-sub">Producer workspace</p>

      <button className="dash-new-btn" onClick={onNew}>
        + New installation
      </button>

      <nav className="dash-nav">
        {navItems.map((item) =>
          item.enabled ? (
            <button
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
        <button className="dash-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
