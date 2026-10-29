const own = (obj, keys) =>
  Object.fromEntries(keys.filter((key) => obj?.[key] !== undefined).map((key) => [key, obj[key]]));
export function toPublicCase(doc) {
  const c = doc?.toObject ? doc.toObject() : doc;
  const discovered = new Set(c.progress?.discoveredClueIds || []);
  return {
    caseId: c.caseId,
    title: c.title,
    story: c.story,
    difficulty: c.difficulty,
    status: c.status,
    setting: own(c.setting, ['location', 'date', 'incidentTime']),
    suspects: (c.suspects || []).map((s) =>
      own(s, ['id', 'name', 'role', 'age', 'description', 'motive', 'alibi', 'avatarAssetId']),
    ),
    evidence: (c.evidence || []).map((e) => ({
      ...own(e, [
        'id',
        'type',
        'title',
        'description',
        'chat',
        'camera',
        'log',
        'imageStatus',
        'frameStatus',
        'assetId',
        'frameAssetIds',
        'uploadAssetId',
      ]),
      imageUrl: e.assetId ? `/api/assets/${e.assetId}` : null,
      clueIds: (c.clues || []).filter((clue) => clue.evidenceId === e.id).map((clue) => clue.id),
    })),
    clues: (c.clues || []).map((clue) =>
      discovered.has(clue.id)
        ? { id: clue.id, evidenceId: clue.evidenceId, discovered: true, text: clue.text }
        : { id: clue.id, evidenceId: clue.evidenceId, discovered: false },
    ),
    hints: {
      used: (c.hints || []).slice(0, c.progress?.hintsUsed || 0),
      total: c.hints?.length || 0,
      remaining: Math.max(0, (c.hints?.length || 0) - (c.progress?.hintsUsed || 0)),
    },
    progress: {
      cluesDiscovered: discovered.size,
      totalClues: c.clues?.length || 0,
      hintsUsed: c.progress?.hintsUsed || 0,
    },
    currentScorePreview: null,
  };
}
