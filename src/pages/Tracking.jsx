import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { store, useStore, EMPTY } from '../lib/store.js';
import { useApp } from '../context.jsx';
import { STAGES, STEP_MS, activeCase, demoCase, hospById, saveCase } from '../lib/data.js';

const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const newVitals = () => ({ hr: rnd(108, 118), sys: rnd(136, 144), dia: rnd(86, 92), spo2: rnd(95, 97), rr: rnd(20, 24) });

export default function Tracking() {
  const { toast } = useApp();
  const cases = useStore('mb_cases', EMPTY);
  const activeId = useStore('mb_active', null);
  const c = cases.find((x) => x.id === activeId) || null;

  const [leg, setLeg] = useState(c && c.stage >= 4 ? 'B' : 'A');
  const legManual = useRef(false);
  const [frac, setFrac] = useState(0);
  const [vit, setVit] = useState(newVitals);
  const baseRef = useRef(), doneRef = useRef(), ambRef = useRef();

  /* when the active case changes, reset the map leg */
  useEffect(() => { setLeg(c && c.stage >= 4 ? 'B' : 'A'); legManual.current = false; }, [activeId]); // eslint-disable-line

  /* simulation clock */
  useEffect(() => {
    if (!activeId) return;
    const tick = () => {
      const cur = activeCase(); if (!cur) return;
      let f = Math.min(1, (Date.now() - cur.stageStart) / STEP_MS);
      if (cur.stage < 5 && f >= 1) {
        const n = cur.stage + 1;
        saveCase({ ...cur, stage: n, stageStart: Date.now(), times: { ...(cur.times || {}), [n]: Date.now() } });
        f = 0;
        if (!legManual.current) setLeg(n >= 4 ? 'B' : 'A');
      }
      if (cur.stage === 5) f = 1;
      setFrac(f);
    };
    tick();
    const t = setInterval(tick, 250);
    const v = setInterval(() => setVit(newVitals()), 1500);
    return () => { clearInterval(t); clearInterval(v); };
  }, [activeId]);

  const s = c ? c.stage : 0;
  /* move the ambulance marker along the route */
  useLayoutEffect(() => {
    if (!c || !baseRef.current) return;
    const path = baseRef.current, len = path.getTotalLength();
    const prog = leg === 'A' ? (s < 2 ? 0 : s === 2 ? frac : 1) : (s < 4 ? 0 : s === 4 ? frac : 1);
    const pos = leg === 'A' ? prog : 1 - prog;
    const pt = path.getPointAtLength(len * pos);
    ambRef.current.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    doneRef.current.setAttribute('stroke-dasharray', (len * prog) + ' ' + (len * 2));
    doneRef.current.setAttribute('stroke-dashoffset', leg === 'A' ? 0 : -(len * (1 - prog)));
  });

  if (!c) {
    return (
      <div className="card empty">
        <h3>No active case to track</h3>
        <p className="muted" style={{ margin: '6px 0 18px' }}>Send an emergency request, or start a demo case to see how tracking works.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/request" className="b-red">Request Emergency Help</a>
          <button className="b-primary" onClick={() => demoCase()}>Start a demo case</button>
        </div>
      </div>
    );
  }

  const h = hospById(c.hospital);
  const remaining = s < 2 ? 20 - s * 2 : s === 2 ? 8 * (1 - frac) + 12 : s === 3 ? 12 : s === 4 ? 12 * (1 - frac) : 0;
  const live = s < 2 ? 'Hospital is confirming the request' : s === 2 ? 'Ambulance heading to the patient' : s === 3 ? 'Patient being loaded' : s === 4 ? 'Ambulance heading to hospital' : 'Patient arrived at hospital';
  const cor = s < 2 ? 'Preparing' : s === 5 ? 'Completed' : 'Green corridor active';
  const code = { P1: 'P1 CRITICAL', P2: 'P2 SERIOUS', P3: 'P3 STABLE' }[c.sev];

  const setLegManual = (l) => { setLeg(l); legManual.current = true; };
  const share = () => {
    const link = window.location.href.split('#')[0] + '#/tracking';
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Link copied (demo)'), () => toast('Copy this link: ' + link));
  };

  return (
    <>
      <div className="banner">
        <div className="l"><span className={'code ' + c.sev.toLowerCase()}>{code}</span><span className="caseid">#{c.id}</span><span className="live">{live}</span></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="b-dark b-sm" style={{ border: '1px solid rgba(255,255,255,.3)' }} onClick={share}>Share live link</button>
          <a className="b-red b-sm" href="tel:112">Call 112</a>
        </div>
      </div>
      <div className="g2-wide">
        <div>
          <div className="card">
            <div className="eta-card">
              <div><h3 style={{ fontSize: 20 }}>{c.name}</h3><p className="muted">{c.age} yrs, {c.sex} &bull; {c.care} case</p></div>
              <div className="eta-big"><small>Dynamic ETA <span className="badge estimated">Simulated</span></small><b>{s === 5 ? 'Arrived' : '~' + Math.ceil(remaining) + ' mins'}</b></div>
            </div>
            <div className="tiles">
              <div><small>Pickup location</small><b>{c.address}</b></div>
              <div><small>Destination intake</small><b>{h.name}</b></div>
              <div><small>Corridor status</small><b style={{ color: '#047857' }}>{cor}</b></div>
            </div>
          </div>
          <div className="card">
            <h3>Live transit corridor map</h3>
            <div className="tabs-a">
              <button className={leg === 'A' ? 'on' : ''} onClick={() => setLegManual('A')}>Hospital &rarr; Location</button>
              <button className={leg === 'B' ? 'on' : ''} onClick={() => setLegManual('B')}>Location &rarr; Hospital</button>
            </div>
            <div className="routemap"><svg viewBox="0 0 400 240">
              <rect width="400" height="240" fill="#dff3f1" />
              <path d="M0 80 L400 40 M0 170 L400 210 M90 0 L140 240 M300 0 L260 240" stroke="#fff" strokeWidth="9" opacity=".85" />
              <path ref={baseRef} d="M330 50 C250 60 220 170 60 190" fill="none" stroke="#9bb5bd" strokeWidth="4" strokeDasharray="7 7" />
              <path ref={doneRef} d="M330 50 C250 60 220 170 60 190" fill="none" stroke="#0fa08f" strokeWidth="5" strokeLinecap="round" />
              <g transform="translate(330 50)"><circle r="16" fill="#0c2a42" /><text textAnchor="middle" y="6" fontSize="17" fill="#fff" fontWeight="800">H</text></g>
              <g transform="translate(60 190)"><circle r="16" fill="#e53935" /><text textAnchor="middle" y="6" fontSize="15" fill="#fff" fontWeight="800">P</text></g>
              <g ref={ambRef}><circle r="13" fill="#19c3b1" stroke="#fff" strokeWidth="3" /><text textAnchor="middle" y="5" fontSize="13" fill="#071a2b" fontWeight="800">+</text></g>
            </svg></div>
            <p className="small muted" style={{ marginTop: 8 }}><b>H</b> = hospital, <b>P</b> = patient pickup. Route is a simulation, not a real map.</p>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Patient vitals feed</h3><span className="badge simulated">Simulated telemetry</span></div>
            <div className="vitals">
              <div><small>Heart rate</small><b>{vit.hr}</b><em>BPM</em></div>
              <div><small>Blood pressure</small><b>{vit.sys}/{vit.dia}</b></div>
              <div><small>SpO2</small><b>{vit.spo2}</b><em>%</em></div>
              <div><small>Respiration</small><b>{vit.rr}</b><em>RPM</em></div>
            </div>
            <div className="ecg"><small>LEAD II &bull; CONTINUOUS (SIMULATED)</small>
              <svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 35 H80 L95 35 L105 12 L118 52 L130 4 L142 35 H230 L245 35 L255 22 L268 44 L280 35 H400" /><path className="sweep" d="M0 35 H80 L95 35 L105 12 L118 52 L130 4 L142 35 H230 L245 35 L255 22 L268 44 L280 35 H400" /></svg></div>
          </div>
        </div>
        <aside>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Target facility</h3><span className="badge green">{s < 1 ? 'Pending' : 'Accepted'}</span></div>
            <h4 style={{ fontSize: 17, marginTop: 8 }}>{h.name}</h4>
            <p className="muted small">{h.area} &bull; {h.km} km away</p>
            <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><small>Allocated bay</small><b>Resus Bay 02</b></div>
              <div><small>Team</small><b>Pre-alerted</b></div>
            </div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Case status timeline</h3><span className="badge declared">Stage {s + 1} of 6</span></div>
            <ol className="tl">
              {STAGES.map((st, i) => {
                const cls = i < s ? 'done' : i === s ? (s === 5 ? 'done' : 'now') : 'future';
                const t = i === 0 ? c.created : c.times && c.times[i];
                const when = i <= s && t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Estimated';
                return (
                  <li key={i} className={cls}>
                    <div className="dot" dangerouslySetInnerHTML={{ __html: i < s || (i === s && s === 5) ? '&#10003;' : String(i + 1) }} />
                    <div><h4>{st[0]} <small>{when}</small></h4><small>{st[1]}</small></div>
                  </li>
                );
              })}
            </ol>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <button className="b-out b-sm" onClick={() => { if (c.stage < 5) saveCase({ ...c, stageStart: Date.now() - STEP_MS }); }}>Advance step (demo)</button>
              <button className="b-out b-sm" onClick={() => { saveCase({ ...c, stage: 0, stageStart: Date.now(), times: {} }); setLeg('A'); legManual.current = false; toast('Demo restarted'); }}>Restart demo</button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
