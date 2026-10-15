/* =====================================================================
   Ambulance Response Delay Prediction - FORM FIELDS
   ---------------------------------------------------------------------
   This is the ONLY file you need to edit when the backend team changes
   the input fields. Each entry becomes one input on the form, is
   validated automatically and is sent to the API under its `key`.

   NOTE: these fields are a first version. Compare `key` names, units and
   allowed values with what Prateek's API expects and edit them here.
   ===================================================================== */

const HOURS = Array.from({ length: 24 }, (_, h) => [String(h), String(h).padStart(2, '0') + ':00 - ' + String(h).padStart(2, '0') + ':59'])

export const FIELDS = [
  {
    key: 'area', label: 'Incident area / zone', type: 'select', required: true, placeholder: 'Select area',
    options: ['Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi', 'Noida', 'Gurugram', 'Ghaziabad', 'Faridabad'].map((a) => [a, a]),
  },
  {
    key: 'distance_km', label: 'Distance from nearest ambulance base (km)', type: 'number', required: true,
    min: 0.1, max: 100, step: 0.1, placeholder: 'e.g. 6.5', hint: 'Between 0.1 and 100 km',
  },
  {
    key: 'hour_of_day', label: 'Hour of request', type: 'select', required: true, asNumber: true, placeholder: 'Select hour', options: HOURS,
  },
  {
    // 0 = Monday ... 6 = Sunday
    key: 'day_of_week', label: 'Day of week', type: 'select', required: true, asNumber: true, placeholder: 'Select day',
    options: [['0', 'Monday'], ['1', 'Tuesday'], ['2', 'Wednesday'], ['3', 'Thursday'], ['4', 'Friday'], ['5', 'Saturday'], ['6', 'Sunday']],
  },
  {
    key: 'traffic_level', label: 'Traffic level', type: 'select', required: true, placeholder: 'Select traffic',
    options: [['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High'], ['severe', 'Severe']],
  },
  {
    key: 'weather', label: 'Weather', type: 'select', required: true, placeholder: 'Select weather',
    options: [['clear', 'Clear'], ['rain', 'Rain'], ['fog', 'Fog / smog'], ['heat', 'Extreme heat']],
  },
  {
    key: 'priority', label: 'Case priority', type: 'select', required: true, placeholder: 'Select priority',
    options: [['P1', 'P1 Critical'], ['P2', 'P2 Serious'], ['P3', 'P3 Stable']],
  },
  {
    key: 'vehicle_type', label: 'Ambulance type', type: 'select', required: true, placeholder: 'Select type',
    options: [['BLS', 'Basic Life Support (BLS)'], ['ALS', 'Advanced Life Support (ALS)']],
  },
  {
    key: 'ambulances_available', label: 'Ambulances available nearby', type: 'number', required: true,
    min: 0, max: 50, step: 1, integer: true, placeholder: 'e.g. 3', hint: 'Whole number, 0 to 50',
  },
]

/* "Use current time" button fills these two fields */
export function currentTimeValues() {
  const d = new Date()
  return { hour_of_day: String(d.getHours()), day_of_week: String((d.getDay() + 6) % 7) } // JS Sunday=0 -> our Monday=0
}

export function emptyValues() {
  const base = Object.fromEntries(FIELDS.map((f) => [f.key, '']))
  return { ...base, ...currentTimeValues() }
}

/* ---------- validation (runs before the API is called) ---------- */
export function validate(values) {
  const errors = {}
  for (const f of FIELDS) {
    const raw = String(values[f.key] ?? '').trim()
    if (raw === '') { if (f.required) errors[f.key] = f.type === 'select' ? 'Please choose an option.' : 'This field is required.'; continue }
    if (f.type === 'number') {
      const n = Number(raw)
      if (!Number.isFinite(n)) errors[f.key] = 'Enter a valid number.'
      else if (f.integer && !Number.isInteger(n)) errors[f.key] = 'Enter a whole number.'
      else if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) errors[f.key] = `Enter a value between ${f.min} and ${f.max}.`
    } else if (f.type === 'select' && !f.options.some(([v]) => v === raw)) {
      errors[f.key] = 'Please choose a valid option.'
    }
  }
  return errors
}

/* ---------- the JSON body sent to the backend ---------- */
export function buildPayload(values) {
  const out = {}
  for (const f of FIELDS) {
    const raw = String(values[f.key]).trim()
    out[f.key] = f.type === 'number' || f.asNumber ? Number(raw) : raw
  }
  return out
}
