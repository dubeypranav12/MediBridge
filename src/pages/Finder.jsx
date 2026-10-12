import React, { useState } from 'react';
import { store } from '../lib/store.js';
import { useApp, go } from '../context.jsx';
import { HOSP, hospById, loadClass, loadColor } from '../lib/data.js';

const CARES = ['All', 'Emergency', 'Cardiac', 'Trauma', 'Maternity'];

export function chooseHosp(id) {
  const d = store.get('mb_draft', {});
  store.set('mb_draft', { ...d, hospital: id });
  go('request');
}

function ProfileModal({ h, closeModal }) {
  return (
    <>
      <h3>{h.name}</h3>
      <div className="rows">
        <div><span>Area</span><b>{h.area}</b></div><div><span>Distance</span><b>{h.km} km</b></div><div><span>Estimated travel</span><b>{h.eta} mins</b></div>
        <div><span>ICU beds</span><b>{h.icu}</b></div><div><span>Ventilators</span><b>{h.vent}</b></div><div><span>Services</span><b>{h.care.join(', ')}</b></div>
        <div><span>Data source</span><b>{h.src} (demo data)</b></div>
      </div>
      <div className="acts"><button className="b-out" onClick={closeModal}>Close</button><button className="b-primary" onClick={() => { closeModal(); chooseHosp(h.id); }}>Request help</button></div>
    </>
  );
}

export default function Finder() {
  const { openModal, closeModal } = useApp();
  const [care, setCare] = useState('All');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('eta');
  const [sel, setSel] = useState(null);

  const list = HOSP.filter((h) => (care === 'All' || h.care.includes(care)) && (h.name + ' ' + h.area).toLowerCase().includes(q.toLowerCase()));
  list.sort((a, b) => ((a.load === 'Saturated') - (b.load === 'Saturated')) || (sort === 'icu' ? b.icu - a.icu : a[sort] - b[sort]));
  const sh = hospById(sel);

  return (
    <>
      <h1 className="ph">Hospital Finder &amp; Bed Availability</h1>
      <p className="ph-sub">Open to everyone, no login needed. All figures are simulated demo data.</p>
      <div className="card">
        <div className="sbox">
          <div><label htmlFor="fQuery">Search hospital or area</label><input id="fQuery" type="text" placeholder="e.g. Sector 12, Heart Institute" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div><label htmlFor="fSort">Sort priority</label>
            <select id="fSort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="eta">Fastest travel time</option><option value="km">Nearest first</option><option value="icu">Most ICU beds</option>
            </select></div>
        </div>
        <div className="chips-a" id="fChips">
          {CARES.map((c) => <button key={c} className={care === c ? 'on' : ''} onClick={() => setCare(c)}>{c === 'All' ? 'All facilities (' + HOSP.length + ')' : c}</button>)}
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Badges show where a figure comes from: <span className="badge verified">Verified</span> <span className="badge declared">Declared</span> <span className="badge estimated">Estimated</span> <span className="badge simulated">Simulated</span></p>
      </div>
      <div className="g2-wide">
        <div>
          <h2 className="ph" style={{ fontSize: 19 }} id="fCount">{list.length} hospital{list.length === 1 ? '' : 's'} ranked for you</h2>
          <div id="hospList">
            {list.length ? list.map((h) => (
              <article key={h.id} className={'hcard' + (sel === h.id ? ' sel' : '')} style={{ borderLeftColor: loadColor[h.load] }} onClick={() => setSel(h.id)}>
                <div className="hc-top">
                  <div className="tags"><span className={'badge ' + h.src.toLowerCase()}>{h.src}</span>{h.care.map((c) => <span key={c} className="badge declared">{c}</span>)}</div>
                  <div className="etabox"><b>{h.eta} mins</b><small>{h.km} km &bull; {h.load} load</small></div>
                </div>
                <h3>{h.name}</h3><p className="muted">{h.area}</p>
                <div className="metrics">
                  <div><small>ICU beds</small><b className={h.icu ? 'g' : 'r'}>{h.icu ? h.icu + ' open' : 'None'}</b></div>
                  <div><small>Ventilators</small><b>{h.vent} ready</b></div>
                  <div><small>Intake load</small><b className={loadClass[h.load]}>{h.load}</b></div>
                  <div><small>Distance</small><b>{h.km} km</b></div>
                </div>
                <div className="hc-actions">
                  <button className="b-out b-sm" onClick={(e) => { e.stopPropagation(); openModal(<ProfileModal h={h} closeModal={closeModal} />); }}>View profile</button>
                  <button className="b-primary b-sm" onClick={(e) => { e.stopPropagation(); chooseHosp(h.id); }}>Request bed pre-alert &amp; admission</button>
                </div>
              </article>
            )) : <div className="card empty"><h3>No hospitals match</h3><p className="muted">Try another care type or clear the search.</p></div>}
          </div>
        </div>
        <aside>
          <div className="card">
            <h3>Live corridor &amp; hospital cluster</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>Click a pin to select a hospital.</p>
            <div className="mapbox">
              <svg id="fMap" viewBox="0 0 400 320">
                <rect width="400" height="320" fill="#dbeff0" />
                <path d="M0 100 L400 60 M0 250 L400 190 M110 0 L160 320 M290 0 L250 320" stroke="#fff" strokeWidth="10" opacity=".85" />
                <circle cx="200" cy="160" r="46" fill="#19c3b1" opacity=".15" />
                {list.map((h) => {
                  const s = sel === h.id;
                  return (
                    <g key={h.id} className="pin" transform={`translate(${h.x} ${h.y})`} onClick={() => setSel(h.id)}>
                      <circle r={s ? 17 : 13} fill={loadColor[h.load]} stroke="#fff" strokeWidth="3" />
                      <text textAnchor="middle" y="4" fontSize="11" fill="#fff" fontWeight="800">{h.eta}</text>
                      <text textAnchor="middle" y={s ? 34 : 30} fontSize="10.5" fill="#0c2a42" fontWeight="700">{h.name.split(' ')[0]}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="legend-a"><span><i style={{ background: '#10b981' }}></i>Open</span><span><i style={{ background: '#f59e0b' }}></i>Constrained</span><span><i style={{ background: '#e53935' }}></i>Saturated</span></div>
          </div>
          <div className="card" id="fSel">
            {sh ? (
              <>
                <div className="eyebrow-a" style={{ color: 'var(--teal2)' }}>Selected hospital</div><h3 style={{ marginTop: 4 }}>{sh.name}</h3>
                <p className="muted small">{sh.area} &bull; {sh.km} km &bull; about {sh.eta} mins</p>
                <button className="b-primary wide" style={{ marginTop: 12 }} onClick={() => chooseHosp(sh.id)}>Request help from this hospital</button>
              </>
            ) : <><h3>No hospital selected</h3><p className="muted small">Click a card or a map pin to see details.</p></>}
          </div>
        </aside>
      </div>
    </>
  );
}
