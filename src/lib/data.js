import { store } from './store.js';

export function ymd(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/* ---------- seed demo data (only on first run) ---------- */
if (!store.get('mb_users')) {
  store.set('mb_users', [
    { role: 'patient', name: 'Rajesh Sharma', email: 'patient@demo.test', phone: '9876543210', pass: 'demo1234' },
    { role: 'doctor', name: 'Dr. S. K. Roy', email: 'doctor@demo.test', phone: '9876500000', pass: 'demo1234', spec: 'Trauma & Emergency Medicine' },
  ]);
}
if (!store.get('mb_slots')) {
  store.set('mb_slots', [
    { id: 's1', doctor: 'Dr. S. K. Roy', date: ymd(1), from: '10:00', to: '10:30', note: 'General consultation', booked: null },
    { id: 's2', doctor: 'Dr. S. K. Roy', date: ymd(1), from: '11:00', to: '11:30', note: 'Follow-up visit', booked: null },
  ]);
}
if (!store.get('mb_inv')) {
  store.set('mb_inv', [
    { id: 'INV-1001', service: 'Teleconsultation', amount: 500, status: 'Pending', method: '' },
    { id: 'INV-1002', service: 'Ambulance transport (sample)', amount: 1200, status: 'Paid', method: 'UPI' },
  ]);
}

/* ---------- simulated hospital data (fictional names) ---------- */
export const HOSP = [
  { id: 'H1', name: 'Riverside Heart Institute', area: 'Sector 12', km: 3.2, eta: 9, icu: 3, vent: 2, load: 'Low', care: ['Emergency', 'Cardiac'], src: 'Verified', x: 270, y: 80 },
  { id: 'H2', name: 'City General Hospital', area: 'Central Market Road', km: 1.8, eta: 7, icu: 1, vent: 1, load: 'High', care: ['Emergency', 'Trauma', 'Cardiac'], src: 'Declared', x: 150, y: 150 },
  { id: 'H3', name: 'Lotus Women & Child Care', area: 'Sector 21', km: 4.5, eta: 13, icu: 4, vent: 3, load: 'Low', care: ['Emergency', 'Maternity'], src: 'Verified', x: 90, y: 70 },
  { id: 'H4', name: 'Metro Trauma Centre', area: 'Ring Road', km: 2.6, eta: 8, icu: 2, vent: 2, load: 'Moderate', care: ['Emergency', 'Trauma'], src: 'Verified', x: 210, y: 230 },
  { id: 'H5', name: 'Sunrise Multispeciality', area: 'Sector 44', km: 5.9, eta: 16, icu: 5, vent: 4, load: 'Low', care: ['Emergency', 'Cardiac', 'Maternity', 'Trauma'], src: 'Estimated', x: 330, y: 200 },
  { id: 'H6', name: 'Green Park Clinic', area: 'Green Park Colony', km: 1.2, eta: 5, icu: 0, vent: 0, load: 'Saturated', care: ['Emergency', 'Maternity'], src: 'Simulated', x: 60, y: 210 },
];
export const loadColor = { Low: '#10b981', Moderate: '#f59e0b', High: '#f59e0b', Saturated: '#e53935' };
export const loadClass = { Low: 'g', Moderate: 'a', High: 'a', Saturated: 'r' };
export const hospById = (id) => HOSP.find((h) => h.id === id);
export function bestMatch(care) {
  return HOSP.filter((h) => h.care.includes(care) && h.load !== 'Saturated').sort((a, b) => a.eta - b.eta)[0] || HOSP[0];
}

export const fmtTime = (ts) =>
  new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

/* ---------- live tracking stages ---------- */
export const STAGES = [
  ['Request received', 'Case created and triage priority assigned'],
  ['Hospital confirmed', 'Hospital acknowledged and prepared a bay'],
  ['Ambulance assigned', 'Ambulance leaving the hospital for the patient'],
  ['Pickup done', 'Patient loaded and stabilised on scene'],
  ['On the way to hospital', 'Priority transit to the hospital'],
  ['Arrived at hospital', 'Handoff to the receiving team'],
];
export const STEP_MS = 6000;

export const statusOf = (c) => (c.stage >= 5 ? ['Handoff completed', 'green'] : ['In transit', 'estimated']);

export function activeCase() {
  const id = store.get('mb_active', null);
  return store.get('mb_cases', []).find((c) => c.id === id) || null;
}
export function saveCase(c) {
  store.set('mb_cases', store.get('mb_cases', []).map((x) => (x.id === c.id ? c : x)));
}
export function demoCase() {
  const h = bestMatch('Emergency');
  const id = 'CB-' + (2000 + Math.floor(Math.random() * 7999));
  const c = { id, created: Date.now(), name: 'Demo Patient', age: '45', sex: 'Male', phone: '9876543210', rel: 'Self', care: 'Emergency', sev: 'P1', symptoms: 'Demo case', address: 'Demo pickup point', gps: null, hospital: h.id, stage: 0, stageStart: Date.now() };
  store.set('mb_cases', [c, ...store.get('mb_cases', [])]);
  store.set('mb_active', id);
  return c;
}

export const SAMPLE_PATIENTS = [
  { id: 'CB-1301', name: 'Amit Verma', age: '48', sex: 'Male', care: 'Cardiac', sev: 'P1', status: 'Handoff completed', address: 'Sample record' },
  { id: 'CB-1288', name: 'Pooja Sharma', age: '34', sex: 'Female', care: 'Emergency', sev: 'P2', status: 'Transferred', address: 'Sample record' },
];
