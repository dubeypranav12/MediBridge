import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_BASE, normCase } from '../lib/api.js';
import TrackingView from '../components/tracking/TrackingView.jsx';

function caseIdFromUrl() {
  return new URLSearchParams(window.location.hash.split('?')[1] || '').get('case')?.trim() || '';
}

export default function Tracking() {
  const caseId = caseIdFromUrl();
  const [trackedCase, setTrackedCase] = useState(null);
  const [error, setError] = useState('');
  const streaming = useRef(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    try {
      const response = await api.get('/cases/' + encodeURIComponent(caseId) + '/track');
      setTrackedCase(normCase(response.data.case));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return undefined;
    load();
    let stream;
    if (typeof EventSource !== 'undefined') {
      stream = new EventSource(API_BASE + '/cases/' + encodeURIComponent(caseId) + '/stream', { withCredentials: true });
      stream.onmessage = (message) => {
        try {
          setTrackedCase(normCase(JSON.parse(message.data).case));
          setError('');
          streaming.current = true;
        } catch { /* polling remains available */ }
      };
      stream.addEventListener('done', () => { stream.close(); streaming.current = false; });
      stream.onerror = () => { streaming.current = false; };
    }
    const timer = window.setInterval(() => { if (!streaming.current) load(); }, 3000);
    return () => {
      window.clearInterval(timer);
      stream?.close();
      streaming.current = false;
    };
  }, [caseId, load]);

  if (!caseId) {
    return (
      <div className="card empty">
        <h3>No case selected</h3>
        <p className="muted" style={{ margin: '6px 0 18px' }}>Open a case from your dashboard or enter its tracking URL. The presentation animation is isolated from production data.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#/request" className="b-red">Request Emergency Help</a>
          <a href="#/presentation-tracking" className="b-primary">Open Presentation Simulation</a>
        </div>
      </div>
    );
  }

  if (!trackedCase) {
    return (
      <div className="card empty">
        <h3>{error ? 'Cannot load this case' : 'Loading live case…'}</h3>
        {error && <><p className="muted" style={{ margin: '6px 0 14px' }}>{error}</p><button className="b-primary" onClick={load}>Try again</button></>}
      </div>
    );
  }

  return <TrackingView c={trackedCase} />;
}
