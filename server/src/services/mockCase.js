import { DIFFICULTY } from '../config/difficulty.js';
import { randomInt } from 'node:crypto';

const FIRST_NAMES = [
  'Mira', 'Arjun', 'Leela', 'Dev', 'Nikhil', 'Anaya', 'Kabir', 'Rhea', 'Ishaan', 'Tara',
  'Aarav', 'Meera', 'Vihaan', 'Sana', 'Kian', 'Aditi', 'Neil', 'Zoya', 'Rohan', 'Ira',
];
const LAST_NAMES = [
  'Sen', 'Rao', 'Das', 'Malhotra', 'Bose', 'Kapoor', 'Iyer', 'Shah', 'Mehta', 'Nair',
  'Banerjee', 'Patel', 'Khan', 'Joshi', 'Menon', 'Chatterjee', 'Kulkarni', 'Sethi', 'Dutta', 'Gill',
];

function randomNames(count) {
  const firstNames = [...FIRST_NAMES];
  const lastNames = [...LAST_NAMES];
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(
      `${firstNames.splice(randomInt(firstNames.length), 1)[0]} ${lastNames.splice(randomInt(lastNames.length), 1)[0]}`,
    );
  }
  return names;
}

export function makeMockCase(premise, difficulty, uploadCount = 0) {
  const cfg = DIFFICULTY[difficulty];
  const suspectNames = randomNames(cfg.suspects);
  const suspects = Array.from({ length: cfg.suspects }, (_, i) => ({
    id: `s${i + 1}`,
    name: suspectNames[i],
    role: [
      'Operations lead',
      'Accountant',
      'Event coordinator',
      'Security manager',
      'Facilities assistant',
    ][i],
    age: 28 + i * 4,
    description: `A fictional staff member connected to the incident.`,
    motive: `Had a plausible reason to be near the scene.`,
    alibi: `Says they were elsewhere during the incident.`,
  }));
  const evidence = [];
  let index = 0;
  for (const [type, count] of [
    ['chat', cfg.chats],
    ['image', cfg.images],
    ['cctv', cfg.cctv],
  ]) {
    for (let j = 0; j < count; j++) {
      const item = {
        id: `e${++index}`,
        type,
        title:
          type === 'chat'
            ? `Conversation ${j + 1}`
            : type === 'image'
              ? `Scene photograph ${j + 1}`
              : `Camera record ${j + 1}`,
        description: 'A fictional record connected to the incident.',
        imageStatus: type === 'image' || type === 'cctv' ? 'pending' : undefined,
      };
      if (type === 'chat')
        item.chat = {
          participants: ['s1', 's2'],
          messages: [
            {
              sender: suspects[0].name,
              text: 'I left the folder by the east desk.',
              timestamp: new Date().toISOString(),
            },
          ],
        };
      if (type === 'image')
        item.image = { imagePrompt: 'A quiet fictional office desk with a misplaced folder.' };
      if (type === 'cctv')
        item.cctv = {
          camera: `CAM 0${j + 1} - Hallway`,
          framePrompts: ['A low fidelity empty hallway camera view'],
          log: [{ time: '21:40:00', note: 'A figure crosses the far end of the hallway.' }],
        };
      evidence.push(item);
    }
  }
  for (let j = 0; j < uploadCount; j++)
    evidence.push({
      id: `e${++index}`,
      type: 'upload',
      title: `Provided evidence ${j + 1}`,
      description: 'A file supplied by the player.',
      uploadAssetId: null,
    });
  const incriminatingCount = difficulty === 'hard' ? 3 : 2;
  const incriminatingEvidence = ['chat', 'image', 'cctv'].map(
    (type) => evidence.find((item) => item.type === type)?.id,
  );
  const clues = Array.from({ length: cfg.clues }, (_, i) => {
    const incriminating = i < incriminatingCount;
    const redHerring = i >= incriminatingCount && i < incriminatingCount + cfg.redHerrings;
    return {
      id: `c${i + 1}`,
      evidenceId: incriminating
        ? incriminatingEvidence[i % incriminatingEvidence.length]
        : evidence[i % evidence.length].id,
      text: incriminating
        ? [
            'The operations lead had access during the brief handover window.',
            "A timestamp contradicts the operations lead's account of leaving early.",
            'The hallway record places the person with archive access near the desk.',
          ][i]
        : redHerring
          ? 'A late delivery briefly gave another staff member access to the corridor.'
          : 'A detail in the record narrows the timeline without confirming an identity.',
      kind: incriminating ? 'incriminating' : redHerring ? 'red_herring' : 'exculpatory',
      pointsTo: incriminating ? 's1' : `s${(i % (cfg.suspects - 1)) + 2}`,
    };
  });
  return {
    title: `Case File: ${premise.slice(0, 48)}`,
    story: `${premise}. The team gathered at the fictional Northstar office as the evening's plans unfolded. By closing time, an important item had vanished, and each witness offered a different account of the last hour. The available records contain small inconsistencies in timing, access, and routine. The front desk logged a late delivery, while the east corridor camera recorded an unexpected pause near the archive. Several people had ordinary reasons to be in that part of the building, and each account seemed believable on its own. The investigator collected conversations, photographs, and camera notes, then compared them against the posted schedule. A routine handover created a narrow window when nobody was watching the central desk. One detail in the records does not fit the explanation given afterward. Review each item carefully before deciding which account holds up. This fictional training case rewards patient comparison rather than guesswork.`,
    setting: {
      location: 'The fictional Northstar office',
      date: new Date().toISOString().slice(0, 10),
      incidentTime: '21:40',
    },
    suspects,
    evidence,
    clues,
    hints: Array.from({ length: cfg.hints }, (_, i) => ({
      level: i + 1,
      text:
        [
          `Compare the claimed whereabouts with the records.`,
          `Focus on the timing around the east desk.`,
          `Check which account conflicts with the camera timeline.`,
        ][i] || `Revisit the timeline clues.`,
    })),
    solution: {
      culpritId: 's1',
      motive: 'They wanted to conceal an accounting discrepancy.',
      method: 'They used routine access during a busy handover.',
      explanation: `The timeline points to ${suspects[0].name}. The discovered records show their account does not align with the scene details.`,
      keyClueIds: clues
        .filter((x) => x.pointsTo === 's1')
        .slice(0, 2)
        .map((x) => x.id),
    },
  };
}
