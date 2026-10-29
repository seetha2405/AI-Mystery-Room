import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Fingerprint,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  ['01', 'Describe', 'Start with a strange incident.'],
  ['02', 'Investigate', 'Read the records and find clues.'],
  ['03', 'Accuse', 'Choose the suspect you believe did it.'],
  ['04', 'Reveal', 'See the truth and how you scored.'],
];
export default function Home() {
  return (
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="eyebrow-dot" /> YOUR NEXT CASE IS WAITING
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            Every mystery is
            <br />
            generated for you.
            <br />
            <span>Only one suspect did it.</span>
          </motion.h1>
          <p className="hero-sub">
            Create a case from any incident. Search the evidence, compare the stories, and trust the
            details.
          </p>
          <Link to="/create" className="button button-primary button-large">
            Start investigation <ArrowRight size={17} />
          </Link>
          <p className="hero-meta">
            <span>NO TWO CASES ALIKE</span>
            <span className="meta-sep" /> <span>YOUR CALL IS FINAL</span>
          </p>
        </div>
        <div className="board" aria-label="Illustration of an investigation board">
          <div className="board-top">
            <span>
              <i className="rec-dot" /> CASE BOARD
            </span>
            <span>FILE 001 — OPEN</span>
          </div>
          <div className="board-lines">
            <svg viewBox="0 0 500 390" aria-hidden="true">
              <path d="M115 110 245 165 360 95M245 165 125 290M245 165 375 285" />
              <circle cx="245" cy="165" r="4" />
            </svg>
          </div>
          <div className="pin-card pin-main">
            <div className="pin-image">
              <Fingerprint size={31} />
            </div>
            <span className="pin-label">INCIDENT REPORT</span>
            <b>The missing ledger</b>
            <small>Last seen 21:40 · East wing</small>
          </div>
          <div className="pin-card pin-chat">
            <span className="pin-label">CHAT LOG · 21:58</span>
            <p>“I already left. Ask the night team.”</p>
            <div className="chat-read">MESSAGE RECOVERED</div>
          </div>
          <div className="pin-card pin-cam">
            <span className="pin-label">
              <i className="rec-dot" /> CAM 03 · 22:14:09
            </span>
            <div className="cam-scene">
              <span>NO SIGNAL LOST</span>
            </div>
            <small>Back corridor · frame 02</small>
          </div>
          <div className="board-stamp">UNSOLVED</div>
          <span className="board-index">FIG. A / 03</span>
        </div>
      </section>
      <section className="how wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE INVESTIGATION</p>
            <h2>Four steps. One final answer.</h2>
          </div>
          <ArrowDown className="muted-icon" />
        </div>
        <div className="step-grid">
          {steps.map(([n, title, text]) => (
            <article className="step-card" key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="feature-band">
        <div className="wrap">
          <div className="feature-head">
            <p className="eyebrow">EVERY DETAIL MATTERS</p>
            <h2>Evidence that tells a story.</h2>
          </div>
          <div className="feature-grid">
            <article>
              <MessageCircle />
              <h3>Chat logs</h3>
              <p>Recover conversations and catch the details that do not add up.</p>
            </article>
            <article>
              <Sparkles />
              <h3>Photo evidence</h3>
              <p>Examine fictional scene images and their captions for hidden context.</p>
            </article>
            <article>
              <Camera />
              <h3>CCTV records</h3>
              <p>Review timestamped camera frames and event logs.</p>
            </article>
            <article>
              <Search />
              <h3>Hints & scoring</h3>
              <p>Ask for a nudge when you need one. Every hint affects your score.</p>
            </article>
          </div>
          <div className="feature-bottom">
            <span>BUILT FOR THE CURIOUS</span>
            <Link to="/create">
              Open a new case <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="closing wrap">
        <div>
          <p className="eyebrow">THE EVIDENCE IS WAITING</p>
          <h2>Ready to find the truth?</h2>
        </div>
        <Link to="/create" className="button button-primary">
          Start your investigation <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
