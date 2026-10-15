import React, { useState } from 'react';
import { useStore } from '../lib/store.js';
import { useApp } from '../context.jsx';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { fmtTime } from '../lib/data.js';

const TABS = [['pending', 'Waiting for approval'], ['active', 'Approved'], ['rejected', 'Rejected']];
const ROLE_LABEL = { doctor: 'Doctor', driver: 'Ambulance driver' };

export default function Admin() {
  const { toast } = useApp();
  const session = useStore('mb_session', null);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState('');
  const query = useFetch(() => api.get('/admin/users?status=' + tab), [tab], { interval: 8000 });
  const users = query.data?.data.users || [];
  const counts = query.data?.data.counts || { pending: 0, active: 0, rejected: 0 };

  async function setStatus(user, status) {
    if (status === 'rejected' && user.status === 'active' && !window.confirm(`Revoke access for ${user.name}? Their existing session will stop working immediately.`)) return;
    setBusy(user.id);
    try {
      const response = await api.patch('/admin/users/' + user.id + '/status', { body: { status } });
      toast(response.message);
      query.reload();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="card hero-a">
        <div>
          <span className="badge declared">Administrator</span>
          <h1 style={{ marginTop: 8 }}>{session?.name || 'Staff approvals'}</h1>
          <p className="muted">Review doctor and ambulance-driver registrations before they can access protected services.</p>
        </div>
        <span className={'badge ' + (counts.pending ? 'estimated' : 'green')}>{counts.pending} waiting</span>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="tabs-a" style={{ marginBottom: 12 }}>
          {TABS.map(([key, label]) => (
            <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label} ({counts[key]})</button>
          ))}
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Registered</th><th>Action</th></tr></thead>
            <tbody>
              {users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td><b>{user.name}</b>{user.spec ? <><br /><small className="muted">{user.spec}</small></> : null}</td>
                  <td><span className="badge declared">{ROLE_LABEL[user.role] || user.role}</span></td>
                  <td>{user.email}<br /><small className="muted">{user.phone}</small></td>
                  <td><small>{user.createdAt ? fmtTime(user.createdAt) : '-'}</small></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {user.status !== 'active' && <button type="button" className="b-primary b-sm" disabled={busy === user.id} onClick={() => setStatus(user, 'active')}>Approve</button>}{' '}
                    {user.status !== 'rejected' && <button type="button" className="b-out b-sm" disabled={busy === user.id} onClick={() => setStatus(user, 'rejected')}>{user.status === 'active' ? 'Revoke' : 'Reject'}</button>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="muted">{query.error ? query.error.message : query.loading && !query.data ? 'Loading...' : tab === 'pending' ? 'No registrations are waiting for approval.' : 'No accounts in this section.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
