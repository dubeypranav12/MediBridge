import React, { useEffect, useMemo, useRef, useState } from 'react';
import { store, useStore, EMPTY } from '../lib/store.js';
import { useApp } from '../context.jsx';
import { Field } from './ui.jsx';
import {
  ACCEPT, DOC_TYPES, MAX_MB, checkFile, dataUrlToBlob, downloadDoc, fileTag, fmtSize,
  isImage, isPdf, isText, readAsDataURL, typeLabel,
} from '../lib/documents.js';
import { fmtTime } from '../lib/data.js';

/* ---------- preview modal (used by patient AND doctor) ---------- */
function ViewDocModal({ doc, closeModal }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  useEffect(() => {
    let u = '';
    try {
      const blob = dataUrlToBlob(doc.data);
      u = URL.createObjectURL(blob);
      setUrl(u);
      if (isText(doc)) blob.text().then(setText);
    } catch (e) { /* preview not available */ }
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [doc]);

  return (
    <>
      <h3>{doc.title || doc.fileName}</h3>
      <p className="small muted" style={{ marginBottom: 12 }}>
        {typeLabel(doc.type)} &bull; {doc.fileName} &bull; {fmtSize(doc.size)} &bull; uploaded {fmtTime(doc.uploadedAt)} by {doc.ownerName}
      </p>
      {doc.note && <p className="small" style={{ marginBottom: 12 }}><b>Note:</b> {doc.note}</p>}
      {url && isImage(doc) && <img className="preview-img" src={url} alt={doc.fileName} />}
      {url && isPdf(doc) && <iframe className="preview" src={url} title={doc.fileName} />}
      {isText(doc) && <pre className="preview" style={{ overflow: 'auto', padding: 12, whiteSpace: 'pre-wrap', margin: 0 }}>{text}</pre>}
      {!isImage(doc) && !isPdf(doc) && !isText(doc) && (
        <p className="muted">A preview is not available for this file type. Use Download to open it.</p>
      )}
      <div className="acts">
        <button className="b-out" onClick={() => downloadDoc(doc)}>Download</button>
        <button className="b-primary" onClick={closeModal}>Close</button>
      </div>
    </>
  );
}

/* =====================================================================
   PATIENT: upload documents + medical history
   ===================================================================== */
export function PatientDocuments({ session }) {
  const { toast, openModal, closeModal } = useApp();
  const all = useStore('mb_docs', EMPTY);
  const mine = useMemo(() => all.filter((d) => d.ownerEmail === session.email), [all, session.email]);
  const hasHistory = mine.some((d) => d.type === 'history');

  const [type, setType] = useState(hasHistory ? 'lab' : 'history');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState([]);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();

  function addFiles(list) {
    const picked = [...list];
    const problems = picked.map(checkFile).filter(Boolean);
    const good = picked.filter((f) => !checkFile(f));
    setErr(problems.join(' '));
    setFiles((cur) => [...cur, ...good]);
  }

  async function upload(e) {
    e.preventDefault();
    if (!files.length) { setErr('Please choose at least one file to upload.'); return; }
    setBusy(true); setErr('');
    try {
      const made = [];
      for (const f of files) {
        made.push({
          id: 'd' + Date.now() + Math.random().toString(36).slice(2, 7),
          ownerEmail: session.email, ownerName: session.name,
          type, title: '', note: note.trim(),
          fileName: f.name, mime: f.type || '', size: f.size,
          uploadedAt: Date.now(), data: await readAsDataURL(f),
        });
      }
      const saved = store.set('mb_docs', [...made, ...store.get('mb_docs', [])]);
      toast(saved
        ? made.length + (made.length > 1 ? ' documents' : ' document') + ' uploaded. Doctors can now see ' + (made.length > 1 ? 'them.' : 'it.')
        : 'Uploaded for this session only: browser storage is full. Delete older files to keep new ones.');
      setFiles([]); setNote('');
      if (type === 'history') setType('lab');
      if (inputRef.current) inputRef.current.value = '';
    } catch (ex) {
      setErr(ex.message || 'Upload failed. Please try again.');
    }
    setBusy(false);
  }

  function remove(d) {
    store.set('mb_docs', store.get('mb_docs', []).filter((x) => x.id !== d.id));
    toast('Document deleted');
  }

  return (
    <div className="card" id="documents" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3>My medical documents</h3>
        <span className="badge declared">Visible to doctors</span>
      </div>
      <p className="small muted" style={{ marginBottom: 14 }}>
        Upload your medical history and any reports. Doctors on MediBridge can open them from their dashboard. Files stay in this browser (demo).
      </p>

      {hasHistory ? (
        <div className="docprompt ok"><span>&#10003;</span><div><b>Medical history uploaded</b>Thank you. You can add more reports below at any time.</div></div>
      ) : (
        <div className="docprompt"><span>&#9888;</span><div><b>Please upload your medical history document</b>Past illnesses, surgeries, allergies and current medicines help doctors treat you faster in an emergency.</div></div>
      )}

      <div className="tiles" style={{ marginBottom: 16 }}>
        <div><small>Medical history</small><b style={{ color: hasHistory ? '#047857' : '#b45309' }}>{hasHistory ? 'Uploaded' : 'Required'}</b></div>
        <div><small>Other documents</small><b>{mine.filter((d) => d.type !== 'history').length} uploaded</b></div>
        <div><small>Shared with</small><b>Doctors on MediBridge</b></div>
      </div>

      <form onSubmit={upload} noValidate>
        <div className="row2">
          <Field label="Document type" htmlFor="docType">
            <select id="docType" value={type} onChange={(e) => setType(e.target.value)}>
              {DOC_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}{t.v === 'history' ? ' (required)' : ''}</option>)}
            </select>
          </Field>
          <Field label="Note for the doctor (optional)" htmlFor="docNote">
            <input id="docNote" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Diabetes since 2018, allergic to penicillin" />
          </Field>
        </div>

        <div
          className={'dropzone' + (over ? ' over' : '')}
          onClick={() => inputRef.current && inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current && inputRef.current.click(); } }}
        >
          <b>Click to choose files or drag &amp; drop them here</b>
          <small>PDF, JPG, PNG, Word or text &bull; up to {MAX_MB} MB each</small>
          <input ref={inputRef} type="file" multiple accept={ACCEPT} aria-label="Choose documents"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {files.length > 0 && (
          <div className="filechips">
            {files.map((f, i) => (
              <span className="filechip" key={f.name + i}>{f.name} <span className="muted">({fmtSize(f.size)})</span>
                <button type="button" aria-label={'Remove ' + f.name} onClick={() => setFiles(files.filter((_, j) => j !== i))}>&times;</button>
              </span>
            ))}
          </div>
        )}

        <p className="err" style={{ marginTop: 10 }}>{err}</p>
        <button className="b-primary" type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload ' + (type === 'history' ? 'medical history' : 'document') + (files.length > 1 ? 's' : '')}</button>
      </form>

      <h3 style={{ marginTop: 22, fontSize: 15 }}>Uploaded files ({mine.length})</h3>
      <ul className="list">
        {mine.length ? mine.map((d) => (
          <li key={d.id}>
            <span className="docitem">
              <span className="ftype">{fileTag(d.fileName)}</span>
              <span>
                <b>{d.fileName}</b>
                <small className="muted">{typeLabel(d.type)} &bull; {fmtSize(d.size)} &bull; {fmtTime(d.uploadedAt)}{d.note ? ' \u2022 ' + d.note : ''}</small>
              </span>
            </span>
            <span className="docacts">
              {d.type === 'history' && <span className="badge green">History</span>}
              <button className="b-out b-sm" onClick={() => openModal(<ViewDocModal doc={d} closeModal={closeModal} />, { wide: true })}>View</button>
              <button className="b-out b-sm" onClick={() => downloadDoc(d)}>Download</button>
              <button className="b-out b-sm" onClick={() => remove(d)}>Delete</button>
            </span>
          </li>
        )) : <li className="muted">No documents yet. Start with your medical history above.</li>}
      </ul>
    </div>
  );
}

/* =====================================================================
   DOCTOR: read-only access to every patient's documents
   ===================================================================== */
export function DoctorDocuments() {
  const { openModal, closeModal } = useApp();
  const all = useStore('mb_docs', EMPTY);
  const [who, setWho] = useState('all');
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');

  const patients = useMemo(() => {
    const m = new Map();
    all.forEach((d) => {
      const p = m.get(d.ownerEmail) || { email: d.ownerEmail, name: d.ownerName, count: 0, history: false };
      p.count++; if (d.type === 'history') p.history = true;
      m.set(d.ownerEmail, p);
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const rows = all.filter((d) =>
    (who === 'all' || d.ownerEmail === who) &&
    (kind === 'all' || d.type === kind) &&
    (d.fileName + ' ' + d.ownerName + ' ' + (d.note || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="card" id="docDocuments">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3>Patient documents</h3>
        <span className="badge declared">{all.length} file{all.length === 1 ? '' : 's'} &bull; {patients.length} patient{patients.length === 1 ? '' : 's'}</span>
      </div>
      <p className="small muted" style={{ marginBottom: 12 }}>
        Medical history and reports uploaded by patients. Open or download them before a consultation or an incoming case.
      </p>

      <div className="sbox three">
        <div>
          <label htmlFor="dcPatient">Patient</label>
          <select id="dcPatient" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="all">All patients</option>
            {patients.map((p) => <option key={p.email} value={p.email}>{p.name} ({p.count}){p.history ? '' : ' - no history'}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dcType">Type</label>
          <select id="dcType" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All types</option>
            {DOC_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label.split(' (')[0]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dcSearch">Search</label>
          <input id="dcSearch" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="File, patient or note" />
        </div>
      </div>

      <div className="tblwrap">
        <table className="tbl">
          <thead><tr><th>Patient</th><th>Document</th><th>Type</th><th>Size</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((d) => (
              <tr key={d.id}>
                <td><b>{d.ownerName}</b></td>
                <td>{d.fileName}{d.note && <><br /><small className="muted">{d.note}</small></>}</td>
                <td><span className={'badge ' + (d.type === 'history' ? 'green' : 'declared')}>{typeLabel(d.type)}</span></td>
                <td>{fmtSize(d.size)}</td>
                <td>{fmtTime(d.uploadedAt)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a className="lnk" onClick={() => openModal(<ViewDocModal doc={d} closeModal={closeModal} />, { wide: true })}>View</a>
                  {' \u00b7 '}
                  <a className="lnk" onClick={() => downloadDoc(d)}>Download</a>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="muted">{all.length ? 'No documents match these filters.' : 'No documents yet. Files that patients upload from their dashboard will appear here.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* small helper used by the patient hero to show a reminder */
export function useNeedsHistory(email) {
  const all = useStore('mb_docs', EMPTY);
  return !all.some((d) => d.ownerEmail === email && d.type === 'history');
}
