const BASE = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const PATH = import.meta.env.VITE_PREDICT_PATH || '/predict/response-delay';
const TIMEOUT_MS = 15000;

export const IS_AVAILABLE = Boolean(BASE);
export const API_URL = IS_AVAILABLE ? BASE + PATH : '';

export class PredictionError extends Error {
  constructor(kind, message, fieldErrors) {
    super(message);
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

export async function predictDelay(payload, { signal } = {}) {
  if (!IS_AVAILABLE) {
    throw new PredictionError('unavailable', 'Prediction service currently unavailable.');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS);
  const onAbort = () => ctrl.abort('cancelled');
  signal?.addEventListener('abort', onAbort);
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch {
    if (ctrl.signal.aborted) {
      throw ctrl.signal.reason === 'timeout'
        ? new PredictionError('timeout', 'The prediction service took too long to respond. Please try again.')
        : new PredictionError('cancelled', 'Request cancelled.');
    }
    throw new PredictionError('network', 'Cannot reach the deployed prediction service.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  let data = null;
  try { data = await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) {
    if (response.status === 400 || response.status === 422) {
      throw new PredictionError('validation', 'The service rejected some inputs.', fieldErrorsFrom(data));
    }
    throw new PredictionError('server', 'The prediction service returned error ' + response.status + '.');
  }
  return normalise(data);
}

function fieldErrorsFrom(data) {
  const output = {};
  const list = Array.isArray(data?.detail) ? data.detail : [];
  for (const detail of list) {
    const key = Array.isArray(detail.loc) ? detail.loc[detail.loc.length - 1] : null;
    if (typeof key === 'string') output[key] = detail.msg || 'Invalid value.';
  }
  return Object.keys(output).length ? output : undefined;
}

function normalise(data) {
  const raw = data && (data.predicted_delay_minutes ?? data.delay_minutes ?? data.predicted_delay ?? data.minutes ?? data.prediction);
  const minutes = typeof raw === 'string' && raw.trim() ? Number(raw) : raw;
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new PredictionError('response', 'The prediction service sent an unexpected answer.');
  }
  let range = data.range ?? data.confidence_interval ?? null;
  if (Array.isArray(range) && range.length === 2) range = { low: range[0], high: range[1] };
  if (range && !(Number.isFinite(range.low) && Number.isFinite(range.high))) range = null;
  return { minutes, range, modelVersion: data.model_version ?? data.version ?? null };
}
