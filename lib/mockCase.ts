import type { Difficulty, Evidence, PublicCase, SecretSolution, Tone } from './types';

export function generateMockCase(scenario: string, difficulty: Difficulty = 'medium', tone: Tone = 'realistic') {
  const caseId = `case-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const suspects = [
    { id: 'suspect-1', name: 'Nora Vale', age: 34, role: 'Hotel manager', relationshipToVictim: 'Former business partner', publicAlibi: 'She was in the ballroom finishing invoices.', portraitUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop' },
    { id: 'suspect-2', name: 'Julian Moss', age: 41, role: 'Auctioneer', relationshipToVictim: 'Ex-lover', publicAlibi: 'He was rehearsing his speech in the gallery.', portraitUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop' },
    { id: 'suspect-3', name: 'Mara Finch', age: 28, role: 'Security technician', relationshipToVictim: 'Close friend', publicAlibi: 'She claims she was in the maintenance room checking alarms.', portraitUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=400&auto=format&fit=crop' },
    { id: 'suspect-4', name: 'Arthur Pike', age: 52, role: 'Jewelry appraiser', relationshipToVictim: 'Rival collector', publicAlibi: 'He was in the penthouse handling verification paperwork.', portraitUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=400&auto=format&fit=crop' },
    { id: 'suspect-5', name: 'Iris Quinn', age: 30, role: 'Wedding coordinator', relationshipToVictim: 'Friendly rival', publicAlibi: 'She was on the terrace guiding guests to the ceremony.', portraitUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop' },
  ];

  const evidence: Evidence[] = [
    {
      id: 'chat-1',
      type: 'chat',
      title: 'Group: Wedding planner check-in',
      tags: ['time', 'location'],
      participants: [
        { id: 'p1', displayName: 'Mara' },
        { id: 'p2', displayName: 'Iris' },
        { id: 'p3', displayName: 'Nora' },
      ],
      messages: [
        { id: 'm1', senderId: 'p2', text: 'If the vault alarm is tripped before 9:20, we need the brass key on standby.', timestamp: '2026-06-15T20:12:00Z' },
        { id: 'm2', senderId: 'p1', text: 'I can do a quick pass on the service corridor. No one will notice.', timestamp: '2026-06-15T20:14:00Z' },
        { id: 'm3', senderId: 'p3', text: 'Thanks, the wing doors remain locked until the toast begins.', timestamp: '2026-06-15T20:15:00Z' },
      ],
    },
    {
      id: 'image-1',
      type: 'image',
      title: 'Service corridor at 20:17',
      tags: ['location'],
      caption: 'A hall image showing the corridor light and the adjacent cart.',
      takenAt: '2026-06-15T20:17:00Z',
      location: 'North service corridor',
      imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=900&auto=format&fit=crop',
      imageStatus: 'ok',
      altText: 'A dim hallway with a utility cart near the exit.',
    },
    {
      id: 'cctv-1',
      type: 'cctv',
      title: 'Camera 3 – Service corridor',
      tags: ['time', 'location', 'suspect'],
      cameraLabel: 'Camera 3 – Service Corridor',
      frames: [
        { imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop', timestamp: '2026-06-15T20:18:00Z', description: 'A figure in a dark jacket reaches the service corridor junction.' },
        { imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop', timestamp: '2026-06-15T20:19:00Z', description: 'The figure pauses and checks both directions before moving toward the south wing.' },
        { imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop', timestamp: '2026-06-15T20:21:00Z', description: 'The same person disappears toward the storage corridor.' },
      ],
      imageStatus: 'ok',
    },
    {
      id: 'doc-1',
      type: 'document',
      subtype: 'access_log',
      title: 'South wing access log',
      tags: ['time', 'location'],
      rows: [
        { time: '20:14', door: 'South Wing Door', user: 'Mara Finch' },
        { time: '20:19', door: 'Archive Lock', user: 'Mara Finch' },
        { time: '20:22', door: 'South Wing Door', user: 'Mara Finch' },
      ],
    },
    {
      id: 'doc-2',
      type: 'document',
      subtype: 'receipt',
      title: 'Receipt summary',
      tags: ['time'],
      rows: [
        { time: '20:05', item: 'Battery pack', vendor: 'Cinder & Co.' },
        { time: '20:08', item: 'Padlock', vendor: 'North Hall Supply' },
      ],
    },
    {
      id: 'chat-2',
      type: 'chat',
      title: 'Private note thread',
      tags: ['suspect', 'time'],
      participants: [{ id: 'p4', displayName: 'Mara' }, { id: 'p5', displayName: 'Nora' }],
      messages: [
        { id: 'm4', senderId: 'p5', text: 'You still have the brass key from the rehearsal? Please be careful tonight.', timestamp: '2026-06-15T20:20:00Z' },
        { id: 'm5', senderId: 'p4', text: 'I do. I only need ten minutes to finish.', timestamp: '2026-06-15T20:21:00Z' },
      ],
    },
    {
      id: 'image-2',
      type: 'image',
      title: 'Clock near the storage vault',
      tags: ['time'],
      caption: 'A close-up of the vault clock showing the exact hour of the theft.',
      takenAt: '2026-06-15T20:22:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=900&auto=format&fit=crop',
      imageStatus: 'ok',
      altText: 'A wall clock beside an antique cabinet.',
    },
    {
      id: 'doc-3',
      type: 'document',
      subtype: 'call_log',
      title: 'Phone call trail',
      tags: ['suspect', 'time'],
      rows: [
        { time: '20:16', from: 'Mara Finch', to: 'Iris Quinn', duration: '02:32' },
        { time: '20:18', from: 'Mara Finch', to: 'Arthur Pike', duration: '00:46' },
      ],
    },
  ];

  const publicCase: PublicCase = {
    id: caseId,
    title: 'The Vanished Sapphire',
    scenarioSeed: scenario,
    difficulty,
    tone,
    briefing:
      'A rare sapphire vanished from the Bellweather Hotel during a wedding weekend. The jewel was kept in a locked display case and the staff now rely on the evidence to find the thief.',
    setting: 'Bellweather Hotel, Rosewood',
    suspects,
    evidence,
    hintsAvailable: 3,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  const secretSolution: SecretSolution = {
    caseId,
    culpritId: 'suspect-3',
    motive: 'Mara Finch needed the sapphire to settle a debt and wanted to frame a rival employee.',
    method: 'She used a maintenance key and the service corridor to reach the vault before the wedding guests arrived.',
    opportunity: 'She had the only valid access pattern and was seen moving between the alarm room and the archive shortly before the theft.',
    timeline: [
      { time: '20:12', event: 'A maintenance chat mentions the brass key and service corridor.' },
      { time: '20:14', event: 'Mara accesses the South Wing door with the key.' },
      { time: '20:17', event: 'The corridor camera shows her moving to the archive.' },
      { time: '20:19', event: 'The jewel disappears from the display case.' },
      { time: '20:22', event: 'Mara leaves the access log and keeps the key in her pocket.' },
    ],
    clueMap: [
      { clueId: 'clue-1', explanation: 'The chat reveals a hidden maintenance path and a planned key movement.', evidenceIds: ['chat-1'] },
      { clueId: 'clue-2', explanation: 'The corridor footage shows the suspect reaching the archive and pausing near the display case.', evidenceIds: ['cctv-1'] },
      { clueId: 'clue-3', explanation: 'The access log proves the security key was used at the relevant times.', evidenceIds: ['doc-1'] },
      { clueId: 'clue-4', explanation: 'The call trail links the suspect to the timing of the theft.', evidenceIds: ['doc-3'] },
    ],
    redHerrings: [
      { suspectId: 'suspect-1', whatItLooksLike: 'The hotel manager had a motive over unpaid costs and a panic around the evening cash flow.', whyItFails: 'Her alibi and paperwork place her in the ballroom, not near the vault.' },
      { suspectId: 'suspect-4', whatItLooksLike: 'Arthur Pike had a personal grudge against the victim and handled the appraisal.', whyItFails: 'His paperwork shows he was in the penthouse, not the archive corridor.' },
    ],
    hints: [
      'The thief used a service route and was not one of the ceremonial guests.',
      'The real culprit had direct access to the internal security paths and the key log shows it.',
      'The guilty suspect is Mara Finch; the evidence converges on her maintenance access and timing.',
    ],
  };

  return { publicCase, secretSolution };
}
