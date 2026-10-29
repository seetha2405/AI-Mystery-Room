import { describe, expect, it, vi } from 'vitest';

const { cases, assets } = vi.hoisted(() => ({ cases: new Map(), assets: new Map() }));
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const selectView = (value, projection) => {
  const copy = clone(value);
  if (!copy) return copy;
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
  select(value) {
    this.projection = value;
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
      cases.set(document.caseId, clone(document));
      return clone(document);
    },
    findOne: ({ caseId }) => query(() => cases.get(caseId)),
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
    expect(dump).not.toContain('pointsTo');
    expect(dump).not.toContain('culpritId');
    const clueId = publicResponse.body.data.clues[0].id;
    await request(app).post(`/api/cases/${caseId}/clues/${clueId}/discover`).expect(200);
    expect(
      (await request(app).post(`/api/cases/${caseId}/clues/${clueId}/discover`).expect(200)).body
        .data.alreadyDiscovered,
    ).toBe(true);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(200);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(200);
    await request(app).post(`/api/cases/${caseId}/hints`).expect(409);
    await request(app).post(`/api/cases/${caseId}/accuse`).send({ suspectId: 's1' }).expect(200);
    await request(app).get(`/api/cases/${caseId}/result`).expect(200);
    await request(app).post(`/api/cases/${caseId}/accuse`).send({ suspectId: 's1' }).expect(409);
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
