import React, { useEffect, useReducer, useState } from 'react';
import { store, useStore } from './lib/store.js';
import { api, clearSession } from './lib/api.js';
import { AppProvider, useApp } from './context.jsx';
import Home from './pages/Home.jsx';
import AppShell from './components/AppShell.jsx';
import { ROUTES } from './lib/routes.js';

/* hash router: "#/login", "#/patient" ... ; anything else shows the Main Dashboard */
function parseRoute() {
  const h = window.location.hash;
  if (!h.startsWith('#/')) return null;
  const name = h.slice(2).split('?')[0];
  if (name === 'home' || !ROUTES[name]) return null;
  return name;
}

function Router() {
  const [, force] = useReducer((x) => x + 1, 0);
  const session = useStore('mb_session', null);
  const [authReady, setAuthReady] = useState(false);
  const { toast, nextAfterLogin } = useApp();

  /* Restore login from the secure backend cookie. */
  useEffect(() => {
    api.get('/auth/me')
      .then((r) => store.set('mb_session', { ...r.data.user, id: r.data.user.id }))
      .catch(() => clearSession())
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', force);
    return () => window.removeEventListener('hashchange', force);
  }, []);

  const name = parseRoute();
  const r = name && ROUTES[name];
  const blocked = !!(authReady && r && r.role && (!session || session.role !== r.role));

  useEffect(() => {
    if (blocked) {
      toast('Please login as a ' + r.role + ' to open this page.');
      nextAfterLogin.current = name;
      window.location.hash = '#/login';
    }
  }, [blocked, name]); // eslint-disable-line

  if (!name) return <Home />;
  if (!authReady && r?.role) return <div className="authwrap"><div className="card"><p>Checking your secure session…</p></div></div>;
  return <AppShell name={blocked ? 'login' : name} />;
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
