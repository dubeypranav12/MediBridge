import React, { useState } from 'react';
import { api } from '../lib/api.js';
import { useApp } from '../context.jsx';
import { Field } from '../components/ui.jsx';
import { afterLogin } from './Login.jsx';

export default function Register() {
  const app = useApp();
  const [f, setF] = useState({ name: '', email: '', phone: '', pass: '', conf: '' });
  const [bad, setBad] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const b = {
      name: f.name.trim().length < 2,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()),
      phone: !/^[6-9]\d{9}$/.test(f.phone.trim()),
      pass: f.pass.length < 6,
      conf: f.conf !== f.pass || !f.conf,
    };
    setBad(b);
    if (Object.values(b).some(Boolean)) { setErr('Please fix the highlighted fields.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await api.post('/auth/register', { body: { role: 'patient', name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.pass, confirmPassword: f.conf } });
      afterLogin(r.data, app);
    } catch (ex) {
      if (ex.errors) setBad({ name: !!ex.errors.name, email: !!ex.errors.email, phone: !!ex.errors.phone, pass: !!ex.errors.password, conf: !!ex.errors.confirmPassword });
      setErr(ex.message);
    }
    setBusy(false);
  };

  return (
    <div className="authwrap">
      <div className="card">
        <h1>Create your account</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Create a patient account. Staff accounts are provisioned securely by an administrator.</p>
        <form onSubmit={submit} noValidate>
          <Field label="Full name" req htmlFor="rName" bad={bad.name} msg="Enter your full name."><input id="rName" type="text" autoComplete="name" value={f.name} onChange={set('name')} /></Field>
          <div className="row2">
            <Field label="Email" req htmlFor="rEmail" bad={bad.email} msg="Enter a valid email."><input id="rEmail" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
            <Field label="Phone" req htmlFor="rPhone" bad={bad.phone} msg="Enter a 10-digit mobile number."><input id="rPhone" type="tel" maxLength={10} autoComplete="tel" value={f.phone} onChange={set('phone')} /></Field>
          </div>
          <div className="row2">
            <Field label="Password" req htmlFor="rPass" bad={bad.pass} msg="At least 6 characters."><input id="rPass" type="password" autoComplete="new-password" value={f.pass} onChange={set('pass')} /></Field>
            <Field label="Confirm password" req htmlFor="rConf" bad={bad.conf} msg="Passwords do not match."><input id="rConf" type="password" autoComplete="new-password" value={f.conf} onChange={set('conf')} /></Field>
          </div>
          <p className="err">{err}</p>
          <button className="b-primary wide" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
        </form>
        <p className="linkrow">Already have an account? <a href="#/login">Login</a></p>
      </div>
    </div>
  );
}
