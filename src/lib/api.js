import { store } from './store.js';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
if (!configuredApiUrl) {
  throw new Error('VITE_API_URL is required. Configure the deployed MediBridge backend URL.');
}

export const API_BASE = configuredApiUrl.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || null;
  }
}

export function saveAuth({ user }) {
  store.set('mb_session', {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    spec: user.spec || '',
  });
}

export function clearSession() {
  store.del('mb_session');
}

async function send(method, path, { body, form, signal } = {}) {
  const headers = {};
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: payload,
      signal,
      credentials: 'include',
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Cannot reach the MediBridge server. Please try again shortly.');
  }

  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch { /* response was not JSON */ }
    if (res.status === 401 && !path.startsWith('/auth/login')) clearSession();
    throw new ApiError(res.status, data?.message || `Request failed (${res.status}).`, data?.errors);
  }
  return res;
}

const json = async (request) => (await request).json();
export const api = {
  get: (path, options) => json(send('GET', path, options)),
  post: (path, options) => json(send('POST', path, options)),
  patch: (path, options) => json(send('PATCH', path, options)),
  del: (path, options) => json(send('DELETE', path, options)),
  blob: async (path) => (await send('GET', path)).blob(),
};

export async function clearAuth() {
  try { await api.post('/auth/logout'); } catch { /* local session still clears */ } finally { clearSession(); }
}

export function normCase(c) {
  if (!c) return null;
  return {
    ...c,
    id: c.caseId,
    name: c.patient.name,
    age: c.patient.age,
    sex: c.patient.sex,
    phone: c.patient.phone,
    address: c.pickupAddress,
    created: c.createdAt,
  };
}
