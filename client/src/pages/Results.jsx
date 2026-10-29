import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Copy, RotateCcw, X } from 'lucide-react';
import { getResult } from '../api/client.js';
import { useToast } from '../components/ToastContext.jsx';
export default function Results() {
  const { caseId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const toast = useToast();
  useEffect(() => {
    let active = true;
    getResult(caseId)
      .then((r) => {
        if (active) setResult(r);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId]);
  if (loading)
    return (
      <main className="center-state">
        <span className="spinner" />
        <p>Opening the verdict…</p>
      </main>
    );
  if (error?.status === 403) return <Navigate to={`/case/${caseId}`} replace />;
  if (error)
    return (
      <main className="center-state">
        <p className="eyebrow">RESULT SEALED</p>
        <h1>Your case is still open.</h1>
        <p>{error.message}</p>
        <Link className="button button-primary" to={`/case/${caseId}`}>
          Return to investigation
        </Link>
      </main>
    );
  const correct = result.verdict === 'correct';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Result link copied.');
    } catch {
      toast('Copy this page link from your browser.');
    }
  };
  return (
    <main className="wrap results-page">
      <Link className="back-link" to={`/case/${caseId}`}>
        <ArrowLeft size={15} /> CASE REVIEW
      </Link>
      <section className={`verdict-banner ${correct ? 'correct' : 'incorrect'}`}>
        <span className="verdict-symbol">{correct ? <Check /> : <X />}</span>
        <div>
          <p className="eyebrow">INVESTIGATION COMPLETE · {result.difficulty.toUpperCase()}</p>
          <h1>{correct ? 'You found the truth.' : 'The wrong suspect.'}</h1>
          <p>
            {correct
              ? 'Your evidence led you to the right answer.'
              : 'The evidence had another story to tell.'}
          </p>
        </div>
        <span className="verdict-file">CASE CLOSED</span>
      </section>
      <div className="results-grid">
        <section className="reveal-card card">
          <p className="eyebrow">THE CULPRIT</p>
          <div className="culprit-row">
            <span className="culprit-avatar">
              {result.culprit.name
                .split(' ')
                .map((x) => x[0])
                .join('')}
            </span>
            <div>
              <h2>{result.culprit.name}</h2>
              <span>{result.culprit.role}</span>
            </div>
          </div>
          <div className="reveal-field">
            <span>MOTIVE</span>
            <p>{result.motive}</p>
          </div>
          <div className="reveal-field">
            <span>METHOD</span>
            <p>{result.method}</p>
          </div>
          <div className="reveal-field">
            <span>FULL EXPLANATION</span>
            <p>{result.explanation}</p>
          </div>
        </section>
        <aside className="score-card card">
          <p className="eyebrow">YOUR SCORE</p>
          <div className="score-total">
            <b>{result.score.total}</b>
            <span>POINTS</span>
          </div>
          <div className="score-row">
            <span>Correct accusation</span>
            <b>{result.score.base > 0 ? `+${result.score.base}` : '+0'}</b>
          </div>
          <div className="score-row">
            <span>Clues discovered</span>
            <b>+{result.score.cluePoints}</b>
          </div>
          <div className="score-row">
            <span>Hints used</span>
            <b className="negative">−{result.score.hintPenalty}</b>
          </div>
          <div className="score-row total">
            <span>TOTAL SCORE</span>
            <b>{result.score.total}</b>
          </div>
          <p className="score-note">
            {result.score.correct
              ? 'Your accusation was correct.'
              : 'Your investigation points still count.'}
          </p>
        </aside>
      </div>
      <section className="key-clues-section">
        <div className="column-head">
          <div>
            <p className="eyebrow">THE DECISIVE EVIDENCE</p>
            <h2>
              Key clues <span>{result.keyClues.length}</span>
            </h2>
          </div>
        </div>
        <div className="key-clue-grid">
          {result.keyClues.map((clue, i) => (
            <article className="key-clue card" key={clue.id}>
              <small>KEY FINDING 0{i + 1}</small>
              <p>{clue.text}</p>
              <span>Evidence {clue.evidenceId.toUpperCase()}</span>
            </article>
          ))}
        </div>
        <button className="text-button" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Hide all findings' : 'Review all clues'} <ArrowRight size={15} />
        </button>
        {showAll && (
          <div className="all-clues">
            {result.allClues.map((clue) => (
              <article key={clue.id}>
                <span className={`clue-kind ${clue.kind}`}>{clue.kind.replace('_', ' ')}</span>
                <p>{clue.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="results-actions">
        <Link className="button button-primary" to="/create">
          <RotateCcw size={15} /> New mystery
        </Link>
        <button className="button button-secondary" onClick={copyLink}>
          <Copy size={15} /> Copy result link
        </button>
        <Link className="button button-secondary" to={`/case/${caseId}`}>
          Review case
        </Link>
      </div>
    </main>
  );
}
