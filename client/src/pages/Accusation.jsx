import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCase } from '../hooks/useCase.js';
import { accuse } from '../api/client.js';
import { useToast } from '../components/ToastContext.jsx';
export default function Accusation() {
  const { caseId } = useParams();
  const { data, loading, error } = useCase(caseId);
  const [selected, setSelected] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  if (loading)
    return (
      <main className="center-state">
        <span className="spinner" />
      </main>
    );
  if (error)
    return (
      <main className="center-state">
        <h1>Case not found</h1>
        <Link to="/create" className="button button-primary">
          Start over
        </Link>
      </main>
    );
  if (data?.status === 'solved') return <Navigate to={`/case/${caseId}/result`} replace />;
  const submit = async () => {
    setBusy(true);
    try {
      await accuse(caseId, selected);
      navigate(`/case/${caseId}/result`, { state: { reveal: true } });
    } catch (e) {
      toast(e.message);
      setBusy(false);
      setConfirm(false);
    }
  };
  return (
    <main className="wrap accuse-page">
      <Link className="back-link" to={`/case/${caseId}`}>
        <ArrowLeft size={15} /> RETURN TO INVESTIGATION
      </Link>
      <div className="accuse-heading">
        <p className="eyebrow">THE FINAL DECISION</p>
        <h1>Who did it?</h1>
        <p>Review the people connected to the case. You have one accusation.</p>
        <div className="final-warning">
          <AlertTriangle size={17} />
          <span>
            <b>This decision is final.</b> Your choice will reveal the complete case solution.
          </span>
        </div>
      </div>
      <div className="accuse-grid">
        {data?.suspects.map((person, i) => (
          <button
            type="button"
            className={`accuse-card ${selected === person.id ? 'selected' : ''}`}
            key={person.id}
            onClick={() => setSelected(person.id)}
            aria-pressed={selected === person.id}
          >
            <span className="radio-dot" />
            <span className="suspect-avatar">
              {person.name
                .split(' ')
                .map((x) => x[0])
                .join('')}
            </span>
            <span className="accuse-number">SUSPECT 0{i + 1}</span>
            <b>{person.name}</b>
            <small>
              {person.role} · {person.age}
            </small>
            <p>{person.motive}</p>
            <span className="accuse-alibi">CLAIMED ALIBI</span>
            <p>{person.alibi}</p>
          </button>
        ))}
      </div>
      <div className="accuse-footer">
        <div>
          <b>{data?.progress.cluesDiscovered} clues recovered</b>
          <span>{data?.progress.hintsUsed} hints used · no score preview</span>
        </div>
        <button
          className="button button-danger"
          disabled={!selected || busy}
          onClick={() => setConfirm(true)}
        >
          Submit accusation <ArrowRight size={16} />
        </button>
      </div>
      {confirm && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <span className="modal-icon warning-icon">
              <AlertTriangle />
            </span>
            <p className="eyebrow">FINAL ACCUSATION</p>
            <h2>Accuse {data.suspects.find((x) => x.id === selected)?.name}?</h2>
            <p>You cannot change this decision once it is submitted.</p>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setConfirm(false)}>
                Go back
              </button>
              <button className="button button-danger" disabled={busy} onClick={submit}>
                {busy ? 'Submitting…' : 'Confirm accusation'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
