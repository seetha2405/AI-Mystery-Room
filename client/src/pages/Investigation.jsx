import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCase } from '../hooks/useCase.js';
import { discoverClue, requestHint } from '../api/client.js';
import { useToast } from '../components/ToastContext.jsx';
import { assetUrl, timeLabel } from '../lib/format.js';

const tabs = ['Story', 'Suspects', 'Evidence', 'Clues'];
const filters = ['All', 'Chats', 'Images', 'CCTV', 'Uploads'];
const typeIcon = { chat: MessageCircle, image: ImageIcon, cctv: Camera, upload: FileText };
export default function Investigation() {
  const { caseId } = useParams();
  const { data, loading, error, refresh } = useCase(caseId);
  const [activeTab, setActiveTab] = useState('Evidence');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmHint, setConfirmHint] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const toast = useToast();
  const evidence = data?.evidence ?? [];
  const visibleEvidence = useMemo(
    () =>
      evidence.filter(
        (item) =>
          filter === 'All' ||
          { Chats: 'chat', Images: 'image', CCTV: 'cctv', Uploads: 'upload' }[filter] === item.type,
      ),
    [evidence, filter],
  );
  if (loading)
    return (
      <main className="wrap center-state">
        <span className="spinner" />
        <p>Opening the case file…</p>
      </main>
    );
  if (error)
    return (
      <main className="wrap center-state">
        <p className="eyebrow">CASE FILE NOT FOUND</p>
        <h1>This trail ends here.</h1>
        <p>{error.message}</p>
        <Link className="button button-primary" to="/create">
          Create a new mystery
        </Link>
      </main>
    );
  if (!data)
    return (
      <main className="wrap center-state">
        <p className="eyebrow">CASE FILE UNAVAILABLE</p>
        <h1>This trail ends here.</h1>
        <p>The case could not be loaded. Try again or create a new mystery.</p>
        <button className="button button-primary" onClick={refresh}>
          Try again
        </button>
        <Link className="button button-secondary" to="/create">
          Create a new mystery
        </Link>
      </main>
    );
  if (data.status === 'solved') return <Navigate to={`/case/${caseId}/result`} replace />;
  const currentEvidence = selected || visibleEvidence[0];
  const clueFor = (evidenceId) =>
    data.clues.find((clue) => clue.evidenceId === evidenceId && !clue.discovered);
  const inspect = async (item) => {
    const clue = clueFor(item.id);
    if (!clue) {
      toast('Nothing more to find here.');
      return;
    }
    setBusy(`clue:${item.id}`);
    try {
      const result = await discoverClue(caseId, clue.id);
      toast(
        result.alreadyDiscovered ? 'You already found this clue.' : 'New clue added to your board.',
      );
      await refresh();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy('');
    }
  };
  const hint = async () => {
    setConfirmHint(false);
    setBusy('hint');
    try {
      const result = await requestHint(caseId);
      toast(`Hint ${result.hint.level} added. 10 points used.`);
      await refresh();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy('');
    }
  };
  const Icon = currentEvidence ? typeIcon[currentEvidence.type] : FileText;
  return (
    <main className="wrap investigation-page">
      <div className="case-top">
        <div>
          <p className="eyebrow">CASE FILE / {data.caseId.slice(0, 8).toUpperCase()}</p>
          <h1>{data.title}</h1>
          <div className="case-meta">
            <span className={`difficulty-tag ${data.difficulty}`}>{data.difficulty}</span>
            <span>{data.setting.location}</span>
            <span>
              {data.setting.date} · {data.setting.incidentTime}
            </span>
          </div>
        </div>
        <Link to={`/case/${caseId}/accuse`} className="button button-primary accusation-button">
          Make accusation <ArrowRight size={16} />
        </Link>
      </div>
      <div className="progress-strip">
        <div>
          <span>CLUES FOUND</span>
          <b>
            {data.progress.cluesDiscovered}
            <i> / </i>
            {data.progress.totalClues}
          </b>
        </div>
        <div className="progress-track">
          <i
            style={{
              width: `${data.progress.totalClues ? (data.progress.cluesDiscovered / data.progress.totalClues) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="progress-hints">
          <Zap size={15} />
          <span>{data.hints.remaining} HINTS LEFT</span>
        </div>
      </div>
      <nav className="mobile-tabs" aria-label="Investigation sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      {activeTab === 'Story' && (
        <section className="mobile-story-panel card">
          <p className="eyebrow">THE INCIDENT</p>
          <h2>{data.title}</h2>
          <p>{data.story}</p>
          <div>
            <span>{data.setting.location}</span>
            <span>
              {data.setting.date} · {data.setting.incidentTime}
            </span>
          </div>
        </section>
      )}
      <div className="investigation-grid">
        <aside
          className={`case-column suspect-column ${activeTab === 'Suspects' ? 'mobile-active' : ''}`}
        >
          <div className="column-head">
            <div>
              <p className="eyebrow">THE PEOPLE</p>
              <h2>
                Suspects <span>{data.suspects.length}</span>
              </h2>
            </div>
          </div>
          <div className="suspect-list">
            {data.suspects.map((person, i) => (
              <article className="suspect-card" key={person.id}>
                <span className="suspect-avatar">
                  {person.name
                    .split(' ')
                    .map((x) => x[0])
                    .join('')}
                </span>
                <div className="suspect-info">
                  <b>{person.name}</b>
                  <span>
                    {person.role} · {person.age}
                  </span>
                  <p>{person.motive}</p>
                  <details>
                    <summary>
                      Alibi <ChevronDown size={12} />
                    </summary>
                    <p>{person.alibi}</p>
                  </details>
                </div>
                <span className="suspect-num">0{i + 1}</span>
              </article>
            ))}
          </div>
          <div className="story-mini card">
            <p className="eyebrow">THE INCIDENT</p>
            <p>{data.story}</p>
            <span>
              {data.setting.location} · {data.setting.incidentTime}
            </span>
          </div>
        </aside>
        <section
          className={`case-column evidence-column ${activeTab === 'Evidence' ? 'mobile-active' : ''}`}
        >
          <div className="column-head">
            <div>
              <p className="eyebrow">THE RECORD</p>
              <h2>
                Evidence <span>{evidence.length}</span>
              </h2>
            </div>
          </div>
          <div className="filter-row">
            {filters.map((item) => (
              <button
                key={item}
                className={filter === item ? 'active' : ''}
                onClick={() => {
                  setFilter(item);
                  setSelected(null);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="evidence-layout">
            <div className="evidence-list">
              {visibleEvidence.map((item) => {
                const ItemIcon = typeIcon[item.type];
                const found = data.clues.some((c) => c.evidenceId === item.id && c.discovered);
                return (
                  <button
                    key={item.id}
                    className={`evidence-item ${currentEvidence?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelected(item)}
                  >
                    <ItemIcon size={16} />
                    <span>
                      <b>{item.title}</b>
                      <small>
                        {item.type === 'upload' ? 'PROVIDED BY YOU' : item.type.toUpperCase()}
                      </small>
                    </span>
                    {found && <Check size={15} className="found-check" />}
                  </button>
                );
              })}
            </div>
            <div className="viewer card">
              {currentEvidence ? (
                <>
                  <div className="viewer-head">
                    <div>
                      <Icon size={16} />
                      <b>{currentEvidence.title}</b>
                    </div>
                    {currentEvidence.type === 'upload' && (
                      <span className="provided-badge">PROVIDED BY YOU</span>
                    )}
                  </div>
                  <p className="viewer-caption">{currentEvidence.description}</p>
                  {currentEvidence.type === 'chat' && (
                    <div className="chat-view">
                      <div className="chat-header">
                        <span className="chat-avatar">
                          {currentEvidence.chat?.participants?.[0]?.slice(0, 1) || '•'}
                        </span>
                        <span>
                          <b>Case conversation</b>
                          <small>last seen recently</small>
                        </span>
                        <span className="chat-secure">ENCRYPTED RECORD</span>
                      </div>
                      <div className="chat-messages">
                        {(currentEvidence.chat?.messages || []).map((message, i) => (
                          <div
                            className={`chat-line ${i % 2 ? 'outgoing' : ''}`}
                            key={`${message.timestamp}-${i}`}
                          >
                            <small>{message.sender}</small>
                            <p>
                              {message.text}
                              <time>{timeLabel(message.timestamp)}</time>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentEvidence.type === 'image' && (
                    <div className="image-viewer">
                      {currentEvidence.imageUrl && currentEvidence.imageStatus === 'ready' ? (
                        <img
                          src={assetUrl(currentEvidence.assetId)}
                          alt={currentEvidence.description}
                          loading="lazy"
                        />
                      ) : (
                        <div className="image-placeholder">
                          <ImageIcon size={34} />
                          <span>
                            {currentEvidence.imageStatus === 'pending'
                              ? 'DEVELOPING EVIDENCE'
                              : 'IMAGE UNAVAILABLE'}
                          </span>
                          <small>{currentEvidence.description}</small>
                        </div>
                      )}
                    </div>
                  )}
                  {currentEvidence.type === 'cctv' && (
                    <div className="cctv-view">
                      <div className="cctv-screen">
                        <div className="cctv-rec">
                          <i className="rec-dot" /> REC <span>{currentEvidence.camera}</span>
                        </div>
                        {currentEvidence.frameAssetIds?.length ? (
                          <img
                            src={assetUrl(
                              currentEvidence.frameAssetIds[
                                Math.min(frameIndex, currentEvidence.frameAssetIds.length - 1)
                              ],
                            )}
                            alt={`${currentEvidence.camera} frame ${frameIndex + 1}`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="cctv-static">
                            {currentEvidence.frameStatus === 'pending'
                              ? 'PROCESSING FRAMES…'
                              : 'NO FRAME AVAILABLE'}
                          </div>
                        )}
                        <span className="cctv-timestamp">
                          {currentEvidence.log?.[
                            Math.min(frameIndex, (currentEvidence.log?.length || 1) - 1)
                          ]?.time ||
                            currentEvidence.log?.[0]?.time ||
                            '00:00:00'}
                        </span>
                      </div>
                      {(currentEvidence.frameAssetIds?.length ||
                        currentEvidence.frameStatus === 'pending') && (
                        <div className="frame-control">
                          <span>
                            FRAME {frameIndex + 1} / {currentEvidence.frameAssetIds?.length || '…'}
                          </span>
                          <input
                            aria-label="CCTV frame"
                            type="range"
                            min="0"
                            max={Math.max(0, (currentEvidence.frameAssetIds?.length || 1) - 1)}
                            value={Math.min(
                              frameIndex,
                              Math.max(0, (currentEvidence.frameAssetIds?.length || 1) - 1),
                            )}
                            onChange={(e) => setFrameIndex(Number(e.target.value))}
                          />
                        </div>
                      )}
                      <div className="cctv-log">
                        <span>EVENT LOG</span>
                        {currentEvidence.log?.map((event) => (
                          <p key={event.time}>
                            <time>{event.time}</time>
                            {event.note}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentEvidence.type === 'upload' && (
                    <div className="upload-view">
                      {currentEvidence.uploadAssetId &&
                      currentEvidence.uploadContentType?.startsWith('image/') ? (
                        <img
                          src={assetUrl(currentEvidence.uploadAssetId)}
                          alt={currentEvidence.description}
                        />
                      ) : (
                        <div>
                          <FileText size={34} />
                          <span>PLAYER-SUPPLIED FILE</span>
                          <a href={assetUrl(currentEvidence.uploadAssetId)} download>
                            Download original file
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="inspect-row">
                    <span>
                      <Search size={15} />
                      {clueFor(currentEvidence.id)
                        ? 'Inspect this record for a clue'
                        : 'All clues found in this record'}
                    </span>
                    <button
                      className="button button-secondary button-small"
                      disabled={
                        !clueFor(currentEvidence.id) || busy === `clue:${currentEvidence.id}`
                      }
                      onClick={() => inspect(currentEvidence)}
                    >
                      {busy === `clue:${currentEvidence.id}`
                        ? 'Searching…'
                        : clueFor(currentEvidence.id)
                          ? 'Inspect'
                          : 'Complete'}{' '}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-view">No evidence matches this filter.</div>
              )}
            </div>
          </div>
        </section>
        <aside
          className={`case-column clue-column ${activeTab === 'Clues' ? 'mobile-active' : ''}`}
        >
          <div className="column-head">
            <div>
              <p className="eyebrow">YOUR FINDINGS</p>
              <h2>
                Clue board <span>{data.progress.cluesDiscovered}</span>
              </h2>
            </div>
          </div>
          <div className="clue-stack">
            {data.clues.map((clue, i) => (
              <article
                key={clue.id}
                className={`clue-note ${clue.discovered ? 'discovered' : 'locked'}`}
              >
                <span className="clue-pin" />
                <small>
                  CLUE {String(i + 1).padStart(2, '0')}{' '}
                  {clue.discovered ? '· RECOVERED' : '· LOCKED'}
                </small>
                {clue.discovered ? (
                  <p>{clue.text}</p>
                ) : (
                  <p className="locked-text">This finding is still hidden.</p>
                )}
              </article>
            ))}
          </div>
          <div className="hint-card">
            <div className="hint-heading">
              <Sparkles size={17} />
              <span>NEED A NUDGE?</span>
            </div>
            {data.hints.used.map((hint) => (
              <p className="revealed-hint" key={hint.level}>
                <b>HINT {hint.level}</b>
                {hint.text}
              </p>
            ))}
            <button
              className="button button-secondary hint-button"
              disabled={!data.hints.remaining || busy === 'hint'}
              onClick={() => setConfirmHint(true)}
            >
              {data.hints.remaining
                ? `Request hint · ${data.hints.remaining} left`
                : 'No hints remaining'}
            </button>
            <small>Each hint costs 10 points.</small>
          </div>
        </aside>
      </div>
      {confirmHint && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmHint(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="modal-icon">
              <Zap />
            </span>
            <p className="eyebrow">HINT REQUEST</p>
            <h2 id="hint-title">Use a hint?</h2>
            <p>This costs 10 points and cannot be undone.</p>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setConfirmHint(false)}>
                Keep investigating
              </button>
              <button className="button button-primary" onClick={hint}>
                Use 10 points
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="mobile-accuse">
        <Link className="button button-primary" to={`/case/${caseId}/accuse`}>
          Make accusation <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
