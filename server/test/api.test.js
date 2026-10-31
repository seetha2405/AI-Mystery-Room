import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cases, assets } = vi.hoisted(() => ({ cases: new Map(), assets: new Map() }));
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_AI = 'true';
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const selectView = (value, projection) => {
  const copy = clone(value);
  if (!copy) return copy;
  if (Array.isArray(copy)) return copy.map((item) => selectView(item, projection));
  if (projection === '+solution') return copy;
  if (!projection) {
    delete copy.solution;
    return copy;
  }
  if (projection.includes(' '))
    return Object.fromEntries(projection.split(' ').map((key) => [key, copy[key]]));
  if (projection === 'progress') return { progress: copy.progress };
  return copy;
};
const query = (work) => ({
  projection: '',
  sortOrder: null,
  maxItems: Infinity,
  select(value) {
    this.projection = value;
    return this;
  },
  sort(value) {
    this.sortOrder = value;
    return this;
  },
  limit(value) {
    this.maxItems = value;
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve()
      .then(() => selectView(work(), this.projection))
      .then(resolve, reject);
  },
});

vi.mock('../src/models/Case.js', () => ({
  CaseModel: {
    create: async (document) => {
      const created = { createdAt: new Date().toISOString(), ...clone(document) };
      cases.set(document.caseId, created);
      return clone(created);
    },
    findOne: ({ caseId }) => query(() => cases.get(caseId)),
    find: () =>
      query(() =>
        [...cases.values()]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 20),
      ),
    findOneAndUpdate: (filter, update) =>
      query(() => {
        const doc = cases.get(filter.caseId);
        if (
          !doc ||
          (filter.status && doc.status !== filter.status) ||
          (filter['progress.hintsUsed'] !== undefined &&
            doc.progress.hintsUsed !== filter['progress.hintsUsed']) ||
          (filter['progress.discoveredClueIds'] &&
            JSON.stringify(doc.progress.discoveredClueIds) !==
              JSON.stringify(filter['progress.discoveredClueIds']))
        )
          return null;
        if (update.$set) Object.assign(doc, clone(update.$set));
        if (update.$inc)
          for (const [path, amount] of Object.entries(update.$inc)) {
            const [parent, key] = path.split('.');
            doc[parent][key] += amount;
          }
        cases.set(filter.caseId, doc);
        return doc;
      }),
    updateOne: async ({ caseId, status }, update) => {
      const doc = cases.get(caseId);
      if (!doc || (status && doc.status !== status)) return { matchedCount: 0, modifiedCount: 0 };
      const before = doc.progress.discoveredClueIds.length;
      for (const id of update.$addToSet['progress.discoveredClueIds']
        ? [update.$addToSet['progress.discoveredClueIds']]
        : [])
        if (!doc.progress.discoveredClueIds.includes(id)) doc.progress.discoveredClueIds.push(id);
      cases.set(caseId, doc);
      return {
        matchedCount: 1,
        modifiedCount: doc.progress.discoveredClueIds.length > before ? 1 : 0,
      };
    },
  },
}));
vi.mock('../src/models/Asset.js', () => ({
  AssetModel: {
    create: async (asset) => {
      assets.set(asset.assetId, asset);
      return asset;
    },
    deleteMany: async ({ caseId }) => {
      for (const [id, asset] of assets) if (asset.caseId === caseId) assets.delete(id);
    },
  },
}));

const { app } = await import('../src/app.js');
const request = (await import('supertest')).default;
const validPremise = 'The office ledger vanished during a crowded evening party';

beforeEach(() => {
  cases.clear();
  assets.clear();
});

describe('case API flow', () => {
  it('creates, discovers idempotently, consumes hints, accuses, and reveals the result once', async () => {
    const create = await request(app)
      .post('/api/cases')
      .field('premise', validPremise)
      .field('difficulty', 'easy')
      .expect(201);
    const caseId = create.body.data.caseId;
    const publicResponse = await request(app).get(`/api/cases/${caseId}`).expect(200);
    const dump = JSON.stringify(publicResponse.body);
    expect(dump).not.toContain('solution');
    expect(dump).not.toContain('kind');
    expect(dump).not.toContain('pointsTo');
    expect(dump).not.toContain('culpritId');
    expect(publicResponse.body.data.evidence[0].clueIds).toContain(
      publicResponse.body.data.clues[0].id,
    );
    const clueId = publicResponse.body.data.clues[0].id;
    const firstDiscovery = await request(app)
      .post(`/api/cases/${caseId}/clues/${clueId}/discover`)
      .expect(200);
    expect(firstDiscovery.body.data).toMatchObject({
      clue: { id: clueId },
      progress: { cluesDiscovered: 1 },
      alreadyDiscovered: false,
    });
    expect(firstDiscovery.body.data.clue.text).toBeTruthy();
    const persistedProgress = await request(app).get(`/api/cases/${caseId}`).expect(200);
    expect(persistedProgress.body.data.progress.cluesDiscovered).toBe(1);
    expect(persistedProgress.body.data.clues.find((clue) => clue.id === clueId)).toMatchObject({
      discovered: true,
      text: firstDiscovery.body.data.clue.text,
    });
    const secondDiscovery = await request(app)
      .post(`/api/cases/${caseId}/clues/${clueId}/discover`)
      .expect(200);
    expect(secondDiscovery.body.data.alreadyDiscovered).toBe(true);
    expect(secondDiscovery.body.data.progress.cluesDiscovered).toBe(1);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(200);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(200);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(409);
    const accusation = await request(app)
      .post(`/api/cases/${caseId}/accuse`)
      .send({ suspectId: 's1' })
      .expect(200);
    expect(accusation.body.data.score).toEqual({
      base: 100,
      cluePoints: 5,
      hintPenalty: 20,
      total: 85,
      correct: true,
    });
    await request(app).get(`/api/cases/${caseId}/result`).expect(200);
    await request(app).post(`/api/cases/${caseId}/accuse`).send({ suspectId: 's1' }).expect(409);
  });
  it('lists the 20 newest cases with only the public summary fields', async () => {
    await request(app)
      .post('/api/cases')
      .field('premise', validPremise)
      .field('difficulty', 'easy')
      .expect(201);
    const response = await request(app).get('/api/cases').expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(Object.keys(response.body.data[0]).sort()).toEqual(
      ['caseId', 'createdAt', 'difficulty', 'status', 'title'].sort(),
    );
    expect(JSON.stringify(response.body)).not.toContain('solution');
  });
  it('does not reveal a result before accusation', async () => {
    const create = await request(app)
      .post('/api/cases')
      .field('premise', 'A rare book disappeared from the quiet gallery')
      .field('difficulty', 'easy')
      .expect(201);
    await request(app).get(`/api/cases/${create.body.data.caseId}/result`).expect(403);
  });
  it('reveals the solution after a wrong accusation and scores it as incorrect', async () => {
    const create = await request(app)
      .post('/api/cases')
      .field('premise', 'A silver compass vanished from the archive room')
      .field('difficulty', 'easy')
      .expect(201);
    const caseId = create.body.data.caseId;
    const accusation = await request(app)
      .post(`/api/cases/${caseId}/accuse`)
      .send({ suspectId: 's2' })
      .expect(200);
    expect(accusation.body.data.correct).toBe(false);
    const result = await request(app).get(`/api/cases/${caseId}/result`).expect(200);
    expect(result.body.data.verdict).toBe('incorrect');
    expect(result.body.data.culprit.id).toBe('s1');
  });
});
