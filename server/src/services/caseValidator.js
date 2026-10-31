import { z } from 'zod';
import { DIFFICULTY } from '../config/difficulty.js';
import { AppError } from '../utils/AppError.js';

const chat = z.object({
  participants: z.array(z.string()),
  messages: z.array(
    z.object({
      sender: z.string(),
      text: z.string().max(1500),
      timestamp: z.string(),
      isMe: z.boolean().optional(),
    }),
  ),
});
const evidence = z.object({
  id: z.string(),
  type: z.enum(['chat', 'image', 'cctv', 'upload']),
  title: z.string().max(1500),
  description: z.string().max(1500),
  chat: chat.optional(),
  image: z.object({ imagePrompt: z.string() }).optional(),
  cctv: z
    .object({
      camera: z.string(),
      framePrompts: z.array(z.string()),
      log: z.array(z.object({ time: z.string(), note: z.string() })),
    })
    .optional(),
});
const caseSchema = z.object({
  title: z.string(),
  story: z.string().max(2000),
  setting: z.object({ location: z.string(), date: z.string(), incidentTime: z.string() }),
  suspects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      age: z.number(),
      description: z.string(),
      motive: z.string(),
      alibi: z.string(),
      avatarPrompt: z.string().optional(),
    }),
  ),
  evidence: z.array(evidence),
  clues: z.array(
    z.object({
      id: z.string(),
      evidenceId: z.string(),
      text: z.string().max(1500),
      kind: z.enum(['incriminating', 'exculpatory', 'red_herring']),
      pointsTo: z.string(),
    }),
  ),
  hints: z.array(z.object({ level: z.number(), text: z.string() })),
  solution: z.object({
    culpritId: z.string(),
    motive: z.string(),
    method: z.string(),
    explanation: z.string(),
    keyClueIds: z.array(z.string()),
  }),
  refusalReason: z.string().optional(),
});
const blocked =
  /\b(murder|murdered|suicide|suicidal|rape|sexual assault|torture|bombing|terrorist|self-harm)\b/i;

function normalizeCaseIds(input) {
  if (!input || typeof input !== 'object') return input;
  const normalized = JSON.parse(JSON.stringify(input));
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
  const normalizeSuspectRef = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return /^s\d+$/i.test(trimmed) ? trimmed.toLowerCase() : trimmed;
  };

  normalized.suspects?.forEach((suspect) => {
    suspect.id = normalize(suspect.id);
  });
  normalized.evidence?.forEach((item) => {
    item.id = normalize(item.id);
    item.chat?.participants?.forEach((id, index, ids) => {
      ids[index] = normalizeSuspectRef(id);
    });
    item.chat?.messages?.forEach((message) => {
      message.sender = normalizeSuspectRef(message.sender);
    });
  });
  normalized.clues?.forEach((clue) => {
    clue.id = normalize(clue.id);
    clue.evidenceId = normalize(clue.evidenceId);
    clue.pointsTo = normalize(clue.pointsTo);
  });
  if (normalized.solution) {
    normalized.solution.culpritId = normalize(normalized.solution.culpritId);
    normalized.solution.keyClueIds = normalized.solution.keyClueIds?.map(normalize);
  }
  return normalized;
}

export function validateCase(input, difficulty, uploadCount = 0) {
  input = normalizeCaseIds(input);
  if (input?.refusalReason)
    throw new AppError(
      422,
      'PREMISE_REJECTED',
      'That premise cannot be used for a fictional investigation. Please try another scenario.',
    );
  const strings = [];
  const collectStrings = (value, path = '') => {
    if (typeof value === 'string') strings.push({ value, path });
    else if (Array.isArray(value))
      value.forEach((item, index) => collectStrings(item, `${path}[${index}]`));
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, item]) =>
        collectStrings(item, path ? `${path}.${key}` : key),
      );
  };
  collectStrings(input);
  if (strings.some(({ value, path }) => value.length > (path === 'story' ? 2000 : 1500)))
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'Generated text exceeded the allowed length.');
  if (strings.some(({ value }) => blocked.test(value)))
    throw new AppError(
      422,
      'PREMISE_REJECTED',
      'That premise cannot be used for a fictional investigation. Please try another scenario.',
    );
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      502,
      'INVALID_AI_OUTPUT',
      'The generated case did not meet the required format.',
      parsed.error.issues,
    );
  const c = parsed.data;
  const cfg = DIFFICULTY[difficulty];
  const storyWords = c.story.trim().split(/\s+/).filter(Boolean).length;
  if (storyWords < 120 || storyWords > 250)
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'The story must be between 120 and 250 words.');
  const counts = {
    suspects: cfg.suspects,
    clues: cfg.clues,
    hints: cfg.hints,
    chat: cfg.chats,
    image: cfg.images,
    cctv: cfg.cctv,
    upload: uploadCount,
  };
  if (c.refusalReason)
    throw new AppError(
      422,
      'PREMISE_REJECTED',
      'That premise cannot be used for a fictional investigation. Please try another scenario.',
    );
  if (
    c.suspects.length !== counts.suspects ||
    c.clues.length !== counts.clues ||
    c.hints.length !== counts.hints
  )
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'The generated case had incorrect counts.');
  for (const type of ['chat', 'image', 'cctv', 'upload'])
    if (c.evidence.filter((e) => e.type === type).length !== counts[type])
      throw new AppError(
        502,
        'INVALID_AI_OUTPUT',
        `Expected ${counts[type]} ${type} evidence items.`,
      );
  const allIds = [
    ...c.suspects.map((x) => x.id),
    ...c.evidence.map((x) => x.id),
    ...c.clues.map((x) => x.id),
  ];
  if (new Set(allIds).size !== allIds.length)
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'Generated identifiers must be unique.');
  const suspectIds = new Set(c.suspects.map((x) => x.id));
  const evidenceIds = new Set(c.evidence.map((x) => x.id));
  const clueIds = new Set(c.clues.map((x) => x.id));
  if (c.clues.some((clue) => !evidenceIds.has(clue.evidenceId)))
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'A clue references missing evidence.');
  if (
    !suspectIds.has(c.solution.culpritId) ||
    c.clues.some((x) => !suspectIds.has(x.pointsTo)) ||
    c.solution.keyClueIds.some((id) => !clueIds.has(id))
  )
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'Generated references are inconsistent.');
  if (
    c.evidence.some(
      (item) =>
        (item.type === 'chat' && !item.chat) ||
        (item.type === 'image' && !item.image) ||
        (item.type === 'cctv' && !item.cctv),
    )
  )
    throw new AppError(
      502,
      'INVALID_AI_OUTPUT',
      'Evidence is missing the fields required for its type.',
    );
  if (
    c.evidence.some(
      (item) =>
        item.type === 'chat' &&
        (item.chat.messages.length > 25 ||
          item.chat.participants.some((id) => !suspectIds.has(id)) ||
          item.chat.messages.some(
            (message) =>
              !suspectIds.has(message.sender) && !c.suspects.some((s) => s.name === message.sender),
          )),
    )
  )
    throw new AppError(
      502,
      'INVALID_AI_OUTPUT',
      'Chat records contain invalid participants or too many messages.',
    );
  if (
    c.evidence.some(
      (item) =>
        item.type === 'cctv' &&
        (item.cctv.framePrompts.length < 1 || item.cctv.framePrompts.length > 3),
    )
  )
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'CCTV evidence must contain one to three frames.');
  const referenced = new Set(c.clues.flatMap((clue) => [clue.pointsTo]));
  c.evidence.forEach((item) => {
    if (item.chat?.participants) item.chat.participants.forEach((id) => referenced.add(id));
  });
  if (c.suspects.some((suspect) => !referenced.has(suspect.id)))
    throw new AppError(
      502,
      'INVALID_AI_OUTPUT',
      'Every suspect must be referenced by evidence or a clue.',
    );
  if (
    c.clues.filter((x) => x.kind === 'incriminating' && x.pointsTo === c.solution.culpritId)
      .length < (difficulty === 'hard' ? 3 : 2) ||
    c.clues.filter((x) => x.kind === 'red_herring').length < cfg.redHerrings
  )
    throw new AppError(
      502,
      'INVALID_AI_OUTPUT',
      'The case does not contain enough solvable clues.',
    );
  if (c.hints.some((hint, i) => hint.level !== i + 1 || /culprit|guilty|murderer/i.test(hint.text)))
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'Hints must be progressive and neutral.');
  const culprit = c.suspects.find((s) => s.id === c.solution.culpritId).name.toLowerCase();
  const publicText = [
    c.title,
    c.story,
    c.setting.location,
    c.setting.date,
    c.setting.incidentTime,
    ...c.hints.map((h) => h.text),
    ...c.clues.map((x) => x.text),
    ...c.evidence.flatMap((e) => [e.title, e.description]),
    ...c.suspects.flatMap((s) => [s.description, s.motive, s.alibi]),
  ];
  if (publicText.some((text) => text.toLowerCase().includes(culprit)))
    throw new AppError(502, 'INVALID_AI_OUTPUT', 'A public field reveals the culprit.');
  return c;
}
