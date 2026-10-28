AI Mystery Room: Product & Technical Spec (Single Source of Truth)
AI Mystery Room: Product & Technical Spec
Version 1.0 · Single source of truth for Codex-driven implementation · Spec-driven
development
0. How to Use This Spec (Rules for Codex)
1. This document is authoritative. If code and spec disagree, the spec wins. If the spec is
silent or ambiguous, choose the simplest option, and record the decision in
/docs/DECISIONS.md . Do not invent features outside this spec.
2. Build in the milestone order in Section 16. Do not start a milestone until the previous
one's acceptance criteria pass.
3. Every requirement has an ID (e.g. 
FR-3 ). Reference IDs in commit messages and test
names.
4. The model names, limits and numbers marked (configurable) must live in env vars or a
single 
config.ts , never hard-coded in components.
5. The culprit's identity must NEVER reach the browser before the player submits a final
accusation (see Section 11).
1. Product Overview
AI Mystery Room is a web app where the player supplies a short scenario or story seed
(e.g. "A jewel disappears from a hotel during a wedding"). The backend uses Google
Gemini to invent a complete fictional investigation: a cast of suspects, a hidden truth with
exactly one culprit, and a set of evidence (WhatsApp-style chats, images, CCTV-style
footage, and other documents). The player studies the evidence, optionally uses hints,
and then accuses one suspect. The game reveals whether they were right, explains the
full solution, and shows which clues pointed to the culprit.
Tagline: Give us a story. We'll give you a crime.
1.1 Goals
Turn any short prompt into a playable, fair and solvable mystery in under about 90
seconds (target).
Evidence must feel realistic and visually distinct per type (chat UI, photo gallery, CCTV
viewer).
The solution must be logically deducible from the evidence alone, with exactly one
defensible culprit.
1.2 Non-Goals (v1)
No multiplayer, no leaderboards, no payments.
No real-person or real-brand content (see Section 13).
No native mobile apps (responsive web only).
1.3 Target Users
Casual puzzle and true-crime fans, students, and friend groups playing on a laptop or
phone.
2. Tech Stack
Layer Choice Notes
Framework Next.js (App Router) + TypeScript Frontend and API routes in one
repo
Styling Tailwind CSS Dark, noir / detective-board
Validation Zod All Gemini output validated
against schemas
Storage SQLite via Drizzle ORM for dev.
Postgres-compatible schema
Cases persisted so they can be
resumed and shared
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Page 2 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Layer
Choice
Notes
Image storage
Testing
Hosting
Local 
/public/generated/ in
dev. Abstract behind a
StorageService interface so S3
or GCS can be swapped in
Vitest (unit), Playwright (e2e)
Vercel or any Node host
Secrets: 
bundle.
GEMINI_API_KEY lives only server-side. It must never be exposed to the client
3. Core User Flow
1. Landing page: the player sees a pitch, example scenarios, and a text box.
2. Scenario input: the player enters a case description (10 to 1,000 chars), optionally
adds image or text proofs, and chooses difficulty (Easy, Medium, Hard).
3. Generation screen: an animated progress view shows pipeline stages ("Building the
crime…", "Writing the chats…", "Developing photos…").
4. Case file: the player sees a case briefing, the suspect list, and the evidence board.
5. Investigation: the player opens evidence items, takes notes, and optionally requests
hints.
6. Accusation: the player selects one suspect, optionally writes their reasoning, and
confirms.
7. Verdict and reveal: the game shows right or wrong, the true culprit, motive, method,
timeline, and a clue-by-clue explanation. The player can replay or start a new case.
4. Functional Requirements
4.1 Scenario Input
FR-1: The player can enter a free-text scenario (min 10, max 1,000 characters
(configurable)).
FR-2: The player can choose difficulty (easy | medium | hard). Default: medium.
FR-3: Provide 5 one-click example scenarios on the landing page.
realistic
Page 3 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
FR-4: Input is run through a safety check (Section 13) before generation starts.
Rejected inputs show a friendly message and generate nothing.
FR-4a: The create page presents, in order, the case-description textarea with a live
character counter; an optional Proofs section; difficulty selection; and a Create Case
button. The description is required and the button remains disabled until its trimmed
length is 10 to 1,000 characters.
FR-4b: Proofs may include up to 5 PNG or JPG images, each at most 5 MB, with
thumbnail previews and an individual remove action, plus pasted text evidence (such as
chat logs). File type and size are validated by both client and server.
FR-4c: The scenario, pasted evidence text, and uploaded images are checked by the
safety service before generation. Rejected content creates no job or case.
4.2 Case Generation
FR-5: The system generates a case via the staged pipeline in Section 6.
FR-6: Each case has 4 to 6 suspects (easy: 4, medium: 5, hard: 6), exactly one culprit.
FR-7: Each case has 8 to 14 evidence items (configurable), mixing at least 3 types.
FR-8: Generation progress is streamed to the client (Server-Sent Events) with stage
names and percentage.
FR-8a: POST /api/cases accepts multipart form data and immediately returns a jobId.
The client navigates to /generate/[jobId], subscribes to the job's SSE stream, and is
redirected to /case/[id] only after a successful completion event.
FR-9: If any stage fails validation after retries, the whole attempt is discarded and the
player sees a retryable error. Partial or broken cases must never be shown.
4.3 Evidence Viewing
FR-10: Evidence is displayed on an Evidence Board grid, filterable by type and by tag
(suspect, location, time).
FR-11: Each evidence type has its own viewer (Section 7).
FR-12: The player can mark any evidence as "Important" (starred) and write private
notes per case (stored in localStorage and the DB if signed in).
FR-13: Evidence items are initially all unlocked. In hard mode, 30% of items are locked
behind the hint system or a time-based unlock (configurable). v1 default: all unlocked
in easy and medium.
4.4 Hints
FR-14: The player can request up to 3 hints per case. Hints are pre-generated in the
case bible (not generated on request), ordered from vague to specific, and never name
the culprit outright.
FR-15: Using hints reduces the final score (Section 12).
4.5 Accusation and Verdict
FR-16: The player selects exactly one suspect and confirms in a modal ("This is final.
Are you sure?").
FR-17: Only one accusation per case. After submission the case is locked as 
failed .
solved or
Page 4 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
FR-18: The reveal screen shows: verdict, true culprit, motive, method, opportunity, a
timeline of the real events, a "clue map" linking each key evidence item to what it
proved, and the red herrings and why they failed.
FR-19: The player can share a case via a link (
/case/[id] ). The shared view lets others
play it fresh without seeing the solution.
4.6 Persistence
FR-20: Cases, evidence and results are saved. A "My Cases" page lists past cases
(guest identification via an anonymous session cookie in v1; no login).
5. System Architecture
Browser (Next.js client)
│  REST + SSE
▼
Next.js API routes (server only)
├─ CaseOrchestrator ── runs the pipeline in Section 6
├─ GeminiClient    
── text + image calls, retries, JSON validation
├─ SafetyService   ── input and output moderation
├─ StorageService  ── images / assets
└─ DB (SQLite/Drizzle) ── cases, evidence, sessions, results
Key principle: secret separation. Each case is stored in two parts:
PublicCase: what the client may see (briefing, suspects' public profiles, evidence,
hints on request).
SecretSolution: culprit ID, motive, method, timeline, clue map. Stored server-side only
and returned solely by 
POST /api/cases/:id/accuse .
6. Case Generation Pipeline
The pipeline is sequential. Each stage's output is validated with Zod before the next
begins. Every stage uses Gemini with JSON-only structured output (response schema)
and temperature (configurable, default 0.9 for creative stages, 0.3 for verification).
Stage 1: Case Bible (hidden truth)
Input: scenario, difficulty, default tone (realistic), optional pasted text evidence, and
optional uploaded images. User-provided proofs are established facts in the fictional case and must be
incorporated consistently, not contradicted or silently altered. Output (
CaseBible ):
Page 5 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Title, setting, date and time window, one-paragraph public briefing.
The crime (what happened, where, when).
Cast: 4 to 6 suspects, each with name, age, role, relationship to victim, public alibi,
hidden truth about their whereabouts, and a secret (to create red herrings).
Culprit ID, motive, method, opportunity.
Ground-truth timeline: minute-level events for the key window.
Clue plan: 6 to 10 "deciding clues" (facts that incriminate the culprit or clear others),
each tagged with the evidence type that will carry it. Also 2 to 4 red herrings.
Hints: 3 ordered hints.
Stage 2: Fairness Check (solvability verifier)
A second Gemini call receives the CaseBible and answers as a strict reviewer. It must
confirm all of the following, otherwise the bible is rejected and Stage 1 is retried (max 2
retries (configurable)):
Uniqueness: exactly one suspect satisfies motive, means, and opportunity given the
clue plan.
Sufficiency: the deciding clues, taken together, logically eliminate every other suspect.
No contradictions in the timeline or alibis.
No impossible tech or leaps (no "just knew", no off-screen confessions).
Difficulty fit: easy has one or two direct clues. Hard needs multi-step inference.
Stage 3: Evidence Generation (parallel where possible)
For each item in the clue plan and filler list, generate the artifact per type (Section 7).
Rules:
Every evidence item must carry 
supports metadata (clue IDs it proves) stored in the
SecretSolution only.
Include noise: harmless chat banter, irrelevant photos, so the culprit is not obvious.
Timestamps in all evidence must agree with the ground-truth timeline. Do a
programmatic check for chronological consistency where timestamps are structured
data.
The culprit's name must not appear as a label, filename, alt text, or metadata that gives
it away.
Page 6 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Stage 4: Image Generation
For each image and CCTV-frame evidence item, generate images with the Gemini image
model using the 
imagePrompt from Stage 3. Rules:
Style guidance per type (grainy for CCTV, phone-snapshot look for photos).
No real people, no readable real brands, no gore. Faces should be generic and no
celebrity likeness.
Overlays like CCTV timestamps are applied in the frontend or via canvas/server
image processing, not left to the model, because image models render text unreliably.
If an image fails after 2 retries, fall back to a styled placeholder with a text description
and mark 
imageStatus: "fallback" . The case still ships, but the Fairness Check
requires that no deciding clue depends solely on an image that fell back. If it does,
regenerate or move that clue into a text-based artifact.
Stage 5: Assembly and Final Safety Pass
Run output moderation over all text. Assemble PublicCase and SecretSolution, persist
both, and return the case ID.
Performance target (configurable): median under 90 seconds, hard timeout 180 seconds.
7. Evidence Types
7.1 WhatsApp-Style Chats (
chat )
Generated as structured JSON, rendered by the app. No images, so it is cheap and
reliable.
Page 7 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
type ChatEvidence = {
type: "chat";
id: string;
title: string;                
// e.g. "Group: Wedding Planners"
participants: { id: string; displayName: string }[]; // display names, not 
suspect IDs
messages: {
id: string;
senderId: string;
text: string;
timestamp: string;          
}[];
};
// ISO 8601, in case timezone
status?: "sent" | "delivered" | "read";
deleted?: boolean;          
// renders "This message was deleted"
Viewer: mimics a messaging app (bubbles, timestamps, day separators, group or 1:1
header). Use original styling. Do not use WhatsApp's logo or trademarked assets; label as
a generic "ChatLog" UI that is visually inspired by messaging apps.
7.2 Photos (
image )
type ImageEvidence = {
type: "image";
id: string;
title: string;
caption: string;              
takenAt?: string;             
location?: string;
imageUrl: string;
imageStatus: "ok" | "fallback";
altText: string;
};
// neutral, factual, no spoilers
// ISO 8601, shown as EXIF-style metadata
Viewer: gallery with lightbox, zoom, and a metadata panel.
7.3 CCTV Footage (
cctv )
Video generation is expensive and unreliable, so v1 renders "recordings" as a sequence of
generated still frames played back in a CCTV-style viewer.
Page 8 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
type CctvEvidence = {
type: "cctv";
id: string;
title: string;                
cameraLabel: string;
frames: {
imageUrl: string;
timestamp: string;          
description: string;        
}[];                          
};
// e.g. "Camera 3 – Service Corridor"
// ISO 8601, overlaid by the viewer
// short log note
// 4 to 8 frames
imageStatus: "ok" | "fallback";
Viewer: black-and-white or green tint, scanlines, REC indicator, timestamp overlay,
play/pause with frame scrubber, 1 to 2 seconds per frame. Stretch goal (post-v1): short
clips via a Gemini-family video model, behind a feature flag 
ENABLE_VIDEO_EVIDENCE .
7.4 Additional Document Types (
document )
To strengthen deductions, support text-based artifacts: 
access_log (door or keycard), 
receipt , 
call_log , 
email ,
note . One shared schema:
type DocumentEvidence = {
type: "document";
subtype: "receipt" | "call_log" | "email" | "access_log" | "note";
id: string;
title: string;
rows?: Record<string, string>[];   // for logs and receipts
body?: string;                     
};
// for emails and notes
8. Data Models
type Difficulty = "easy" | "medium" | "hard";
type Tone = "realistic" | "noir" | "cozy";
type Suspect = {
id: string;
name: string;
age: number;
role: string;
Page 9 of 15
  relationshipToVictim: string;
  publicAlibi: string;
  portraitUrl?: string;        // optional generated avatar
};
type PublicCase = {
  id: string;
  title: string;
  scenarioSeed: string;
  difficulty: Difficulty;
  tone: Tone;
  briefing: string;
  setting: string;
  suspects: Suspect[];
  evidence: Evidence[];        // union of Section 7 types, with NO 
`supports` field
  hintsAvailable: number;      // always 3
  status: "open" | "solved" | "failed";
  createdAt: string;
};
type SecretSolution = {
  caseId: string;
  culpritId: string;
  motive: string;
  method: string;
  opportunity: string;
  timeline: { time: string; event: string }[];
  clueMap: { clueId: string; explanation: string; evidenceIds: string[] }[];
  redHerrings: { suspectId: string; whatItLooksLike: string; whyItFails: 
string }[];
  hints: string[];             // length 3, ordered vague to specific
};
type Accusation = {
  caseId: string;
  sessionId: string;
  suspectId: string;
  reasoning?: string;          // max 1000 chars
  hintsUsed: number;
  secondsSpent: number;
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Page 10 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
correct: boolean;
score: number;
submittedAt: string;
};
9. API Specification
All routes return { error: { code, message } } on failure.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | /api/cases | Accepts multipart form data: scenario, difficulty, optional evidenceText, and up to 5 files[] images (PNG/JPG, max 5 MB each). Validates content and returns { jobId }. |
| GET | /api/cases/jobs/:jobId/stream | Returns SSE events { stage, percent, message }, ending with { done: true, caseId } or { error }. |
| GET | /api/cases/:id | Returns PublicCase only. Never includes secrets. |
| POST | /api/cases/:id/hint | Returns the next hint and increments hintsUsed (max 3). |
| POST | /api/cases/:id/accuse | Accepts { suspectId, reasoning?, secondsSpent }, locks the case, and returns verdict plus SecretSolution. |
| GET | /api/cases | Lists the current session's cases. |

Rate limits (configurable): 5 case generations per hour per session or IP, 60 reads per
minute.
10. Frontend Pages and UI
Design language: dark noir palette, subtle paper and corkboard textures, monospace for
evidence metadata, a serif display font for titles. Fully responsive (360px and up). WCAG
AA contrast, keyboard navigable, alt text on all images.
Page 11 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
Route
Content
/
/generate/[jobId]
/case/[id]
/case/[id]/result
Hero, scenario form, difficulty and tone pickers, 5
example scenarios, "How it works" strip
Description textarea (10-1,000 characters with counter), optional proof uploads
(up to 5 PNG/JPG files, 5 MB each, preview and remove), pasted text evidence,
difficulty selection, and Create Case button in that order
Staged progress UI fed by SSE, with flavor text per stage and a cancel button;
successful jobs redirect automatically to /case/[id]
Main game screen: briefing panel, suspect cards,
Evidence Board, notes drawer, hint button, Accuse
button
Reveal screen (Section 4.5, FR-18) with a share
button and "Play again"
/cases
Components: 
My Cases list with status and score
ScenarioForm , 
GenerationProgress , 
ChatViewer , 
ImageViewer , 
SuspectCard , 
CctvViewer , 
EvidenceBoard ,
DocumentViewer , 
NotesDrawer , 
AccuseModal , 
VerdictReveal , 
ClueMap .
HintModal ,
States to handle everywhere: loading skeletons, empty, error with retry, and generation
failed with a "Try a different scenario" action.
11. Game Logic and Anti-Spoiler Rules
GL-1: 
culpritId , 
clueMap , evidence 
supports , and ground-truth timeline never
appear in any response except the 
accuse response.
GL-2: Verify server-side that the case is still 
open before accepting an accusation
(prevents replays).
GL-3: Suspect IDs are opaque random strings, not ordered, so the order of the list leaks
nothing. Shuffle suspect display order per session.
GL-4: Chat participant IDs and suspect IDs are decoupled in the public payload where
needed. The public payload uses display names only.
GL-5: Prompt the model never to place the culprit's identity in titles, filenames,
captions or alt text. Run a programmatic check that the culprit's full name does not
appear in any 
title , 
caption or 
altText field.
Page 12 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
12. Scoring
Score range 0 to 1000 (configurable):
Wrong accusation: 0.
Correct: base 1000, minus 150 per hint used, minus a time penalty of 1 point per 10
seconds beyond 10 minutes (floor of 400 for a correct answer).
Difficulty multiplier: easy ×0.8, medium ×1.0, hard ×1.25 (applied before the floor and
cap at 1000).
13. Safety, Content and Legal
SF-1: Moderate the scenario input and all generated text. Reject or sanitize requests
involving real named people, real ongoing crimes, sexual violence, content involving
minors as victims, or instructions that could facilitate real-world harm.
SF-2: Fictional only. All names must be invented. Prompts must instruct Gemini to avoid
real public figures and real brands. Cases carry a footer "All characters and events are
fictional."
SF-3: Violence must be non-graphic. The "crime" is typically theft, fraud, sabotage,
disappearance or a tasteful murder-mystery in the style of classic detective fiction. No
gore imagery.
SF-4: Do not provide operational crime instructions (e.g. exact methods of making
weapons or poisons). The method should be narrative-level only.
SF-5: Messaging UI must not use WhatsApp trademarks or logos (see 7.1).
SF-6: Provide a visible "Report this case" link on the case page.
14. Reliability and Non-Functional Requirements
NFR-1: All Gemini calls go through one 
GeminiClient with: request timeout (45s text,
60s image), exponential backoff (max 3 attempts), JSON parse and Zod validation, and
structured logging with no PII or API keys.
NFR-2: Stage outputs are cached by 
instead of restarting.
jobId , so a retry resumes from the failed stage
NFR-3: Lighthouse performance 85 or higher on the case page. Images lazy-loaded and
served in WebP.
NFR-4: Never block the UI thread during generation. Use SSE and show progress.
Page 13 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
NFR-5: Unit test coverage for: Zod schemas, scoring, anti-spoiler redaction,
consistency checks. E2E test for the full happy path with mocked Gemini responses.
NFR-6: Cost guard: log estimated token and image usage per case. Abort a job if it
exceeds a configurable cap.
15. Environment, Config and Project Structure
Env vars
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=
GEMINI_IMAGE_MODEL=
DATABASE_URL=
MAX_GENERATIONS_PER_HOUR=5
ENABLE_VIDEO_EVIDENCE=false
USE_MOCK_GEMINI=false     
# returns fixtures for dev and tests
Suggested structure
/app                 
/components          
/lib/gemini          
/lib/pipeline        
/lib/game            
/lib/db              
/lib/storage         
/prompts             
/fixtures            
/docs                
/tests               
# Next.js routes and pages
# UI components and evidence viewers
# client, prompts, schemas
# orchestrator and stages 1-5
# scoring, redaction, consistency checks
# drizzle schema and queries
# StorageService implementations
# versioned prompt templates (.md or .ts)
# sample cases for mock mode
# DECISIONS.md, API.md
# unit and e2e
16. Milestones and Acceptance Criteria
M1: Skeleton and mock mode. Landing page, scenario and proof form, DB schema, mock
Gemini returning a fixture case, case page rendering all four evidence types. Accept: a
fixture case with and without proofs is fully playable end to end with no Gemini calls.
M2: Real text pipeline. Stages 1, 2, 3 and 5 with Gemini, Zod validation, retries, SSE
progress. Accept: 10 random scenarios produce valid cases. Fairness Check passes or
retries cleanly. No schema errors reach the UI.
Page 14 of 15
AI Mystery Room: Product & Technical Spec (Single Source of Truth)
M3: Images and CCTV. Stage 4, StorageService, fallback placeholders, CCTV viewer
overlays. Accept: generated images load. A forced image failure produces a fallback and
the case remains solvable.
M4: Accusation, scoring, reveal. Accuse endpoint, locking, hint endpoint, reveal screen,
clue map. Accept: the culprit never appears in any pre-accusation network response
(automated test). A second accusation attempt returns an error.
M5: Polish and safety. Moderation, rate limiting, My Cases, share links, accessibility pass,
e2e tests. Accept: all NFRs met. Unsafe prompts are rejected with a friendly message.
17. Definition of Done (v1)
A player can enter any safe scenario and receive a playable mystery with chats, images,
CCTV frames and documents.
Exactly one culprit is logically deducible from the evidence.
The solution is hidden until the accusation is submitted.
Failures degrade gracefully and never show broken cases.
All tests pass, and the app runs locally with 
key.
USE_MOCK_GEMINI=true and with a real API
18. Assumptions and Open Questions
Assumed: Next.js, TypeScript, Tailwind and SQLite, because the brief specified only
"AI, Gemini". Swap if you prefer another stack, but update this section.
Assumed: CCTV recordings are image-frame sequences in v1, not real video, for cost
and reliability.
Open: Should accounts or login be added later? (v1 uses anonymous sessions.)
Open: Language support. v1 is English only.
Open: Should difficulty affect evidence count or only clue subtlety? v1: both, per FR-6,
FR-7 and Section 6.
Verify before building: exact current Gemini model names and image-generation
capabilities in Google's documentation, since these change often. Keep them in env
vars.
Page 15 of 15