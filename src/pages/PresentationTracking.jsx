import React, { useEffect, useState } from 'react';
import TrackingView from '../components/tracking/TrackingView.jsx';

const STEP_MS = 6000;
const STATUS = [
  'Waiting for hospital confirmation',
  'Hospital confirmed — preparing ambulance',
  'Ambulance heading to the patient',
  'Patient pickup complete',
  'Ambulance heading to hospital',
  'Patient arrived at hospital',
];

function presentationCase(stage) {
  return {
    id: 'PRESENTATION',
    name: 'Sample Patient',
    age: 42,
    sex: 'Female',
    care: 'Emergency',
    sev: 'P2',
    address: 'Illustrative pickup location',
    stage,
    liveStatus: STATUS[stage],
    corridor: stage < 2 ? 'Preparing' : stage === 5 ? 'Completed' : 'Presentation route active',
    hospitalStatus: stage < 1 ? 'Pending' : 'Accepted',
    hospital: { name: 'MediBridge Partner Hospital', area: 'Delhi NCR', km: 4.2 },
    ambulance: stage >= 2 ? {
      registration: 'DL-PRES-01',
      type: 'Advanced Life Support',
      equipment: ['Monitor', 'Oxygen'],
      position: { source: 'presentation' },
      driverName: 'Presentation Driver',
    } : null,
  };
}

export default function PresentationTracking() {
  const [stage, setStage] = useState(2);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage !== 2 && stage !== 4) { setProgress(stage >= 5 ? 1 : 0); return undefined; }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - started) / STEP_MS);
      setProgress(next);
      if (next >= 1) {
        window.clearInterval(timer);
        setStage((current) => Math.min(5, current + 1));
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [stage]);

  const advance = () => setStage((current) => Math.min(5, current + 1));
  const restart = () => { setStage(0); setProgress(0); };
  return <TrackingView c={presentationCase(stage)} presentation progress={progress} onAdvance={advance} onRestart={restart} />;
}
