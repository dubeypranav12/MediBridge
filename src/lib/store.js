import { useSyncExternalStore } from 'react';

// UI state is memory-only. Authentication is restored from the backend's
// secure HttpOnly cookie, never from browser storage.
const mem = {};
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

export const store = {
  get(key, fallback) {
    return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
  },
  set(key, value) {
    mem[key] = value;
    emit();
    return true;
  },
  del(key) {
    delete mem[key];
    emit();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useStore(key, fallback) {
  return useSyncExternalStore(store.subscribe, () => store.get(key, fallback));
}

export const EMPTY = [];
