import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, Trash2 } from 'lucide-react';
import { deleteCase, getCases } from '../api/client.js';

export default function CaseFiles() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCases(await getCases());
    } catch (requestError) {
      setError(requestError.message || 'Could not load case files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeCase = async (item) => {
    if (!window.confirm(`Delete "${item.title || 'Untitled case'}"? This cannot be undone.`)) return;
    setDeleting(item.caseId);
    setError(null);
    try {
      await deleteCase(item.caseId);
      setCases((current) => current.filter((caseFile) => caseFile.caseId !== item.caseId));
      try {
        if (localStorage.getItem('lastCaseId') === item.caseId) localStorage.removeItem('lastCaseId');
        const recent = JSON.parse(localStorage.getItem('recentCaseIds') || '[]');
        localStorage.setItem('recentCaseIds', JSON.stringify(recent.filter((id) => id !== item.caseId)));
      } catch {
        // The case is deleted even if the browser's local storage is unavailable.
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not delete this case.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="wrap page-wrap case-files-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">INVESTIGATION ARCHIVE</p>
          <h1>Case files.</h1>
          <p className="muted">Your 20 most recently created investigations.</p>
        </div>
        <button className="button button-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="center-state" role="status">
          <span className="spinner" />
          <p>Loading case files…</p>
        </div>
      ) : error ? (
        <section className="card case-files-state" role="alert">
          <h2>Case files unavailable</h2>
          <p>{error}</p>
          <button className="button button-primary" onClick={load}>
            Try again
          </button>
        </section>
      ) : cases.length === 0 ? (
        <section className="card case-files-state">
          <h2>No cases yet</h2>
          <p>Your investigations will appear here after you create one.</p>
          <Link className="button button-primary" to="/create">
            Create a mystery <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <div className="case-files-list">
          {cases.map((item) => (
            <article className="card case-file-card" key={item.caseId}>
              {item.status === 'failed' ? (
                <div className="case-file-link">
                  <div>
                    <p className="eyebrow">
                      {item.difficulty} · {item.status}
                    </p>
                    <h2>{item.title || 'Untitled case'}</h2>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ) : (
                <Link
                  className="case-file-link"
                  to={item.status === 'solved' ? `/case/${item.caseId}/result` : `/case/${item.caseId}`}
                >
                  <div>
                    <p className="eyebrow">
                      {item.difficulty} · {item.status}
                    </p>
                    <h2>{item.title || 'Untitled case'}</h2>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              )}
              <button
                className="button button-danger case-file-delete"
                type="button"
                aria-label={`Delete ${item.title || 'untitled case'}`}
                title="Delete case"
                disabled={deleting === item.caseId}
                onClick={() => removeCase(item)}
              >
                <Trash2 size={16} /> {deleting === item.caseId ? 'Deleting…' : 'Delete'}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
