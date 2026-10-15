import React, { useLayoutEffect, useRef, useState } from 'react';
import { STAGES } from '../../lib/data.js';
import { useApp } from '../../context.jsx';

const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));
const makeVitals = () => ({
  hr: randomBetween(108, 118),
  sys: randomBetween(136, 144),
  dia: randomBetween(86, 92),
  spo2: randomBetween(95, 97),
  rr: randomBetween(20, 24),
});

function AmbulanceCard({ c, presentation }) {
  const ambulance = c.ambulance;
  const position = ambulance?.position;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3>Assigned ambulance</h3>
        {position && <span className="badge green">{presentation ? 'Presentation animation' : 'Live driver GPS'}</span>}
      </div>
      {ambulance ? (
        <>
          <h4 style={{ fontSize: 17, marginTop: 8 }}>{ambulance.registration}</h4>
          <p className="muted small">{ambulance.type}{ambulance.equipment?.length ? ' • ' + ambulance.equipment.join(', ') : ''}</p>
          {!presentation && position && (
            <p className="small" style={{ marginTop: 8 }}>
              Driver GPS updated {new Date(position.updatedAt).toLocaleTimeString('en-IN')}.{' '}
              <a className="lnk" href={'https://www.google.com/maps?q=' + position.lat + ',' + position.lng} target="_blank" rel="noreferrer">Open in Maps</a>
            </p>
          )}
          {!presentation && !position && <p className="small muted" style={{ marginTop: 8 }}>Waiting for driver live location</p>}
          {ambulance.driverName && <p className="small muted" style={{ marginTop: 6 }}>Driver: {ambulance.driverName}{ambulance.driverPhone ? ' • ' + ambulance.driverPhone : ''}</p>}
        </>
      ) : (
        <p className="muted small" style={{ marginTop: 8 }}>
          {c.waitingForAmbulance ? 'Hospital confirmed — waiting for an available ambulance.' : 'An ambulance is assigned after hospital confirmation.'}
        </p>
      )}
    </div>
  );
}

function RouteMap({ c, presentation, progress }) {
  const [leg, setLeg] = useState(c.stage >= 4 ? 'B' : 'A');
  const baseRef = useRef();
  const doneRef = useRef();
  const ambulanceRef = useRef();
  const position = c.ambulance?.position;

  useLayoutEffect(() => {
    if (!presentation || !baseRef.current || !ambulanceRef.current) return;
    const path = baseRef.current;
    const length = path.getTotalLength();
    const stage = c.stage;
    const routeProgress = leg === 'A'
      ? (stage < 2 ? 0 : stage === 2 ? progress : 1)
      : (stage < 4 ? 0 : stage === 4 ? progress : 1);
    const point = path.getPointAtLength(length * (leg === 'A' ? routeProgress : 1 - routeProgress));
    ambulanceRef.current.setAttribute('transform', `translate(${point.x} ${point.y})`);
    doneRef.current.setAttribute('stroke-dasharray', (length * routeProgress) + ' ' + (length * 2));
    doneRef.current.setAttribute('stroke-dashoffset', leg === 'A' ? 0 : -(length * (1 - routeProgress)));
  });

  if (!presentation) {
    return (
      <div className="card">
        <h3>Live driver location</h3>
        {position ? (
          <>
            <div className="routemap">
              <iframe
                title="Live ambulance GPS position"
                src={`https://maps.google.com/maps?q=${position.lat},${position.lng}&z=15&output=embed`}
                style={{ border: 0, width: '100%', height: '100%' }}
                loading="lazy"
              />
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Location comes only from the driver device: {position.lat}, {position.lng}.</p>
          </>
        ) : (
          <div className="routemap" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{ textAlign: 'center' }}><b>Waiting for driver live location</b><p className="small muted" style={{ marginTop: 6 }}>No position is estimated or simulated for this real case.</p></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Presentation transit corridor map</h3>
      <div className="tabs-a">
        <button className={leg === 'A' ? 'on' : ''} onClick={() => setLeg('A')}>Hospital → Location</button>
        <button className={leg === 'B' ? 'on' : ''} onClick={() => setLeg('B')}>Location → Hospital</button>
      </div>
      <div className="routemap"><svg viewBox="0 0 400 240">
        <rect width="400" height="240" fill="#dff3f1" />
        <path d="M0 80 L400 40 M0 170 L400 210 M90 0 L140 240 M300 0 L260 240" stroke="#fff" strokeWidth="9" opacity=".85" />
        <path ref={baseRef} d="M330 50 C250 60 220 170 60 190" fill="none" stroke="#9bb5bd" strokeWidth="4" strokeDasharray="7 7" />
        <path ref={doneRef} d="M330 50 C250 60 220 170 60 190" fill="none" stroke="#0fa08f" strokeWidth="5" strokeLinecap="round" />
        <g transform="translate(330 50)"><circle r="16" fill="#0c2a42" /><text textAnchor="middle" y="6" fontSize="17" fill="#fff" fontWeight="800">H</text></g>
        <g transform="translate(60 190)"><circle r="16" fill="#e53935" /><text textAnchor="middle" y="6" fontSize="15" fill="#fff" fontWeight="800">P</text></g>
        <g ref={ambulanceRef}><circle r="13" fill="#19c3b1" stroke="#fff" strokeWidth="3" /><text textAnchor="middle" y="5" fontSize="13" fill="#071a2b" fontWeight="800">+</text></g>
      </svg></div>
      <p className="small muted" style={{ marginTop: 8 }}><b>H</b> = hospital, <b>P</b> = patient pickup. This is an illustrative animation, not a real map.</p>
    </div>
  );
}

export default function TrackingView({ c, presentation = false, progress = 0, onAdvance, onRestart }) {
  const { toast } = useApp();
  const [vitals] = useState(makeVitals);
  const hospital = c.hospital || {};
  const stage = c.stage || 0;
  const code = { P1: 'P1 CRITICAL', P2: 'P2 SERIOUS', P3: 'P3 STABLE' }[c.sev] || c.sev;
  const remaining = stage < 2 ? 20 - stage * 2 : stage === 2 ? 8 * (1 - progress) + 12 : stage === 3 ? 12 : stage === 4 ? 12 * (1 - progress) : 0;
  const share = () => {
    const link = window.location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
      .then(() => toast('Tracking link copied'), () => toast('Copy this link: ' + link));
  };
  const timeline = c.timeline?.length
    ? c.timeline
    : STAGES.map(([title, detail], index) => ({ title, detail, state: index < stage ? 'done' : index === stage ? 'now' : 'future', at: null }));

  return (
    <>
      {presentation && (
        <div className="alert" style={{ marginBottom: 16 }}>
          <div><div className="eyebrow-a" style={{ color: '#fff', opacity: 0.85 }}>Presentation simulation</div>
            <h3>Frontend-only demonstration</h3>
            <p>No case, payment, ambulance assignment, or database record is created by this screen.</p>
          </div>
        </div>
      )}
      <div className="banner">
        <div className="l"><span className={'code ' + String(c.sev).toLowerCase()}>{code}</span><span className="caseid">#{c.id}</span><span className="live">{c.liveStatus}</span></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!presentation && <button className="b-dark b-sm" style={{ border: '1px solid rgba(255,255,255,.3)' }} onClick={share}>Share live link</button>}
          <a className="b-red b-sm" href="tel:112">Call 112</a>
        </div>
      </div>
      <div className="g2-wide">
        <div>
          <div className="card">
            <div className="eta-card">
              <div><h3 style={{ fontSize: 20 }}>{c.name}</h3><p className="muted">{c.age} yrs, {c.sex} • {c.care} case</p></div>
              <div className="eta-big"><small>{presentation ? 'Illustrative ETA' : 'Backend ETA'}</small><b>{stage === 5 ? 'Arrived' : c.etaMinutes != null && !presentation ? '~' + c.etaMinutes + ' mins' : '~' + Math.ceil(remaining) + ' mins'}</b></div>
            </div>
            <div className="tiles">
              <div><small>Pickup location</small><b>{c.address}</b></div>
              <div><small>Destination intake</small><b>{hospital.name}</b></div>
              <div><small>Corridor status</small><b style={{ color: '#047857' }}>{c.corridor || (stage < 2 ? 'Preparing' : stage === 5 ? 'Completed' : 'Active')}</b></div>
            </div>
          </div>
          <RouteMap c={c} presentation={presentation} progress={progress} />
          {presentation ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Patient vitals feed</h3><span className="badge simulated">Presentation data</span></div>
              <div className="vitals">
                <div><small>Heart rate</small><b>{vitals.hr}</b><em>BPM</em></div>
                <div><small>Blood pressure</small><b>{vitals.sys}/{vitals.dia}</b></div>
                <div><small>SpO2</small><b>{vitals.spo2}</b><em>%</em></div>
                <div><small>Respiration</small><b>{vitals.rr}</b><em>RPM</em></div>
              </div>
              <div className="ecg"><small>LEAD II • PRESENTATION SIMULATION</small>
                <svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 35 H80 L95 35 L105 12 L118 52 L130 4 L142 35 H230 L245 35 L255 22 L268 44 L280 35 H400" /><path className="sweep" d="M0 35 H80 L95 35 L105 12 L118 52 L130 4 L142 35 H230 L245 35 L255 22 L268 44 L280 35 H400" /></svg>
              </div>
            </div>
          ) : (
            <div className="card"><h3>Clinical telemetry</h3><p className="small muted" style={{ marginTop: 8 }}>No live clinical telemetry is connected to this case.</p></div>
          )}
        </div>
        <aside>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Target facility</h3><span className="badge green">{c.hospitalStatus || (stage < 1 ? 'Pending' : 'Accepted')}</span></div>
            <h4 style={{ fontSize: 17, marginTop: 8 }}>{hospital.name}</h4>
            <p className="muted small">{hospital.area}{hospital.km != null ? ' • ' + hospital.km + ' km away' : ''}</p>
          </div>
          <AmbulanceCard c={c} presentation={presentation} />
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><h3>Case status timeline</h3><span className="badge declared">Stage {stage + 1} of 6</span></div>
            <ol className="tl">
              {timeline.map((item, index) => {
                const state = item.state || (index < stage ? 'done' : index === stage ? 'now' : 'future');
                const when = item.at ? new Date(item.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (state === 'future' ? 'Pending' : 'Current');
                return <li key={index} className={state}><div className="dot">{state === 'done' ? '✓' : index + 1}</div><div><h4>{item.title || STAGES[index][0]} <small>{when}</small></h4><small>{item.detail || STAGES[index][1]}</small></div></li>;
              })}
            </ol>
            {presentation && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}><button className="b-out b-sm" onClick={onAdvance}>Advance step</button><button className="b-out b-sm" onClick={onRestart}>Restart presentation</button></div>}
          </div>
        </aside>
      </div>
    </>
  );
}
