import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { createCase } from '../api/client.js';
import { DIFFICULTIES, EXAMPLES } from '../lib/constants.js';
import { useToast } from '../components/ToastContext.jsx';

const stages = [
  'Gathering witnesses…',
  'Dusting for fingerprints…',
  'Developing photographs…',
  'Cross-checking alibis…',
];
export default function CreateMystery() {
  const [premise, setPremise] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const fileRef = useRef(null);
  const controller = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const valid = useMemo(
    () => premise.trim().length >= 20 && premise.trim().length <= 500,
    [premise],
  );
  const addFiles = (list) => {
    const selected = Array.from(list);
    if (files.length + selected.length > 3) {
      toast('Choose up to 3 files.');
      return;
    }
    if (selected.some((f) => f.size > 5 * 1024 * 1024)) {
      toast('Each file must be 5 MB or smaller.');
      return;
    }
    if (
      selected.some(
        (f) => !['image/png', 'image/jpeg', 'image/webp', 'text/plain'].includes(f.type),
      )
    ) {
      toast('Use PNG, JPG, WEBP, or TXT files.');
      return;
    }
    setFiles((current) => [...current, ...selected]);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    controller.current = new AbortController();
    const timer = window.setInterval(() => setStage((n) => (n + 1) % stages.length), 4000);
    try {
      const body = new FormData();
      body.append('premise', premise.trim());
      body.append('difficulty', difficulty);
      files.forEach((file) => body.append('files', file));
      const result = await createCase(body, controller.current.signal);
      localStorage.setItem('lastCaseId', result.caseId);
      const recent = JSON.parse(localStorage.getItem('recentCases') || '[]');
      localStorage.setItem(
        'recentCases',
        JSON.stringify([result.caseId, ...recent.filter((id) => id !== result.caseId)].slice(0, 5)),
      );
      navigate(`/case/${result.caseId}`);
    } catch (error) {
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED')
        toast(
          error.code === 'PREMISE_REJECTED'
            ? 'Try a different fictional scenario.'
            : error.message || 'The AI could not build a fair case. Try rephrasing.',
        );
    } finally {
      window.clearInterval(timer);
      setBusy(false);
    }
  };
  return (
    <main className="wrap page-wrap">
      <div className="page-back">
        <ArrowLeft size={15} />
        <a href="/">BACK TO HOME</a>
        <span> / </span>
        <span>NEW CASE</span>
      </div>
      <div className="page-title-row">
        <div>
          <p className="eyebrow">OPEN A NEW FILE</p>
          <h1>Create your mystery.</h1>
          <p className="muted">
            Give the investigation a starting point. The rest is in the evidence.
          </p>
        </div>
        <div className="step-indicator">
          <span>01</span>
          <i /> <span>SET THE SCENE</span>
        </div>
      </div>
      <form className="create-layout" onSubmit={submit}>
        <div className="form-main card">
          <label className="field-label" htmlFor="premise">
            What happened? <span className="required">*</span>
          </label>
          <p className="field-hint">Describe a fictional incident in 20–500 characters.</p>
          <textarea
            id="premise"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            maxLength={500}
            minLength={20}
            placeholder="The office safe was emptied during the Diwali party…"
            required
          />
          <div className="textarea-bottom">
            <span className={premise.trim().length < 20 ? 'counter warning' : 'counter'}>
              {premise.trim().length} / 500
            </span>
            <span>MIN. 20 CHARACTERS</span>
          </div>
          <div className="examples">
            <span>NEED AN IDEA?</span>
            {EXAMPLES.map((example) => (
              <button type="button" key={example} onClick={() => setPremise(example)}>
                {example} <ArrowRight size={13} />
              </button>
            ))}
          </div>
          <div className="section-divider" />
          <div className="field-title-row">
            <div>
              <label className="field-label">Choose difficulty</label>
              <p className="field-hint">Set how much the case will challenge you.</p>
            </div>
            <span className="optional-label">REQUIRED</span>
          </div>
          <div className="difficulty-grid">
            {DIFFICULTIES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`difficulty-card ${difficulty === item.id ? 'selected' : ''}`}
                onClick={() => setDifficulty(item.id)}
                aria-pressed={difficulty === item.id}
              >
                <span className="radio-dot" />
                <b>{item.name}</b>
                <small>{item.note}</small>
                <span className="difficulty-stats">
                  {item.suspects} SUSPECTS <i /> {item.clues} CLUES
                </span>
                <span className="max-score">
                  {item.base}
                  <small> PTS MAX</small>
                </span>
              </button>
            ))}
          </div>
          <div className="section-divider" />
          <div className="field-title-row">
            <div>
              <label className="field-label">Attach evidence</label>
              <p className="field-hint">
                Add an image or text file for the AI to weave into the story.
              </p>
            </div>
            <span className="optional-label">OPTIONAL</span>
          </div>
          <button
            type="button"
            className="upload-drop"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            <ImagePlus />
            <span>
              <b>Drop files here or browse</b>
              <small>PNG, JPG, WEBP, TXT · Up to 3 files · 5 MB each</small>
            </span>
            <span className="button button-secondary button-small">Browse</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg,image/webp,text/plain"
            onChange={(e) => addFiles(e.target.files)}
          />
          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, i) => (
                <div className="file-chip" key={`${file.name}-${i}`}>
                  {file.type.startsWith('image/') ? (
                    <ImagePlus size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  <span>
                    {file.name}
                    <small>{(file.size / 1024).toFixed(0)} KB</small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles(files.filter((_, index) => index !== i))}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="create-submit-row">
            <span>
              <ShieldCheck size={15} /> Your case is private to anyone with its link.
            </span>
            <button className="button button-primary" disabled={!valid || busy} type="submit">
              Generate mystery <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <aside className="create-aside">
          <div className="aside-card">
            <p className="eyebrow">YOUR INVESTIGATION</p>
            <h3>One case. One answer.</h3>
            <ul>
              <li>Review every suspect</li>
              <li>Inspect records to find clues</li>
              <li>Choose your one final accusation</li>
              <li>Reveal the verdict and score</li>
            </ul>
            <div className="aside-line" />
            <p className="aside-note">
              Hints are available when you need them. Each one costs 10 points.
            </p>
          </div>
          <div className="aside-file">
            <span>CASE GENERATION</span>
            <b>~45 SEC</b>
            <small>Images appear as they are ready</small>
          </div>
        </aside>
      </form>
      {busy && (
        <div
          className="loading-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Generating mystery"
        >
          <div className="loading-card">
            <span className="loading-orbit">
              <LoaderCircle size={35} />
            </span>
            <p className="eyebrow">BUILDING YOUR CASE</p>
            <h2>{stages[stage]}</h2>
            <p>Connecting the evidence. This can take a moment.</p>
            <div className="scanner">
              <i />
            </div>
            <button className="button button-secondary" onClick={() => controller.current?.abort()}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
