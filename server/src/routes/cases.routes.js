import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { randomInt, randomUUID } from 'node:crypto';
import { CaseModel } from '../models/Case.js';
import { AssetModel } from '../models/Asset.js';
import { createCaseContent } from '../services/caseGenerator.js';
import { generateCaseImages } from '../services/imageGenerator.js';
import { toPublicCase } from '../services/sanitize.js';
import { calculateScore } from '../services/scoring.service.js';
import {
  createCaseSchema,
  accuseSchema,
  idSchema,
  clueIdSchema,
} from '../schemas/requests.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { uploadFiles, hasValidSignature } from '../middleware/upload.js';
import { env } from '../config/env.js';

export const casesRouter = Router();
const createRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many cases. Try again in a few minutes.' },
  },
});
const parseId = (id) => {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  return id;
};
const loadCase = async (id, selectSolution = false) => {
  const query = CaseModel.findOne({ caseId: parseId(id) });
  if (selectSolution) query.select('+solution');
  const doc = await query;
  if (!doc) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
  return doc;
};
const receiveUploads = (req, res, next) =>
  uploadFiles(req, res, (error) => (error ? next(error) : next()));

casesRouter.post(
  '/',
  createRateLimit,
  receiveUploads,
  asyncHandler(async (req, res) => {
    const input = createCaseSchema.safeParse(req.body);
    if (!input.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Enter a premise between 20 and 500 characters and select a difficulty.',
        input.error.issues,
      );
    const uploads = req.files || [];
    if (uploads.some((file) => !hasValidSignature(file)))
      throw new AppError(
        415,
        'UNSUPPORTED_FILE_TYPE',
        'One or more files do not match their declared file type.',
      );
    const caseId = randomUUID();
    const uploadIds = [];
    for (const file of uploads) {
      const assetId = randomUUID();
      await AssetModel.create({
        assetId,
        contentType: file.mimetype,
        data: file.buffer,
        size: file.size,
        kind: 'upload',
        caseId,
      });
      uploadIds.push(assetId);
    }
    await CaseModel.create({
      caseId,
      premise: input.data.premise.replace(/[\x00-\x1f\x7f]/g, '').trim(),
      difficulty: input.data.difficulty,
      status: 'generating',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      progress: { discoveredClueIds: [], hintsUsed: 0 },
    });
    try {
      const content = await createCaseContent({ ...input.data, uploads });
      let uploadIndex = 0;
      for (const item of content.evidence)
        if (item.type === 'upload') item.uploadAssetId = uploadIds[uploadIndex++];
      for (const item of content.evidence)
        if (item.type === 'cctv') item.frameStatus = env.USE_MOCK_AI ? 'failed' : 'pending';
      for (const item of content.evidence)
        if (item.type === 'image') item.imageStatus = env.USE_MOCK_AI ? 'failed' : 'pending';
      if (env.USE_MOCK_AI)
        for (const item of content.evidence)
          if (item.imageStatus === 'pending') item.imageStatus = 'failed';
      const startingClueCount = randomInt(2, 4);
      const startingClueIds = [...content.clues]
        .sort(() => Math.random() - 0.5)
        .slice(0, startingClueCount)
        .map((clue) => clue.id);
      const doc = await CaseModel.findOneAndUpdate(
        { caseId, status: 'generating' },
        {
          $set: {
            ...content,
            status: 'active',
            progress: { discoveredClueIds: startingClueIds, hintsUsed: 0 },
          },
        },
        { new: true },
      );
      if (!doc)
        throw new AppError(
          409,
          'CASE_STATE_CONFLICT',
          'The case could not be activated. Please try again.',
        );
      if (!env.USE_MOCK_AI)
        void generateCaseImages(caseId).catch((error) =>
          console.error('Image generation worker failed:', {
            name: error?.name || 'Error',
            code: error?.code || null,
          }),
        );
      return res
        .status(201)
        .json({ success: true, data: { caseId: doc.caseId, status: doc.status } });
    } catch (error) {
      await CaseModel.updateOne({ caseId }, { $set: { status: 'failed' } });
      await AssetModel.deleteMany({ caseId });
      throw error;
    }
  }),
);

casesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const docs = await CaseModel.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('caseId title difficulty status createdAt');
    res.json({
      success: true,
      data: docs.map(({ caseId, title, difficulty, status, createdAt }) => ({
        caseId,
        title,
        difficulty,
        status,
        createdAt,
      })),
    });
  }),
);

casesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const caseId = parseId(req.params.id);
    const deleted = await CaseModel.findOneAndDelete({ caseId });
    if (!deleted) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
    await AssetModel.deleteMany({ caseId });
    res.json({ success: true, data: { caseId } });
  }),
);

casesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const doc = await CaseModel.findOne({ caseId: req.params.id });
    if (!doc) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
    if (doc.status === 'failed')
      throw new AppError(502, 'AI_GENERATION_FAILED', 'This case could not be generated.');
    const publicCase = toPublicCase(doc);
    res.json({
      success: true,
      data: {
        caseId: publicCase.caseId,
        title: publicCase.title,
        story: publicCase.story,
        suspects: publicCase.suspects,
        evidence: publicCase.evidence,
        clues: publicCase.clues,
        hints: publicCase.hints,
        progress: publicCase.progress,
        difficulty: publicCase.difficulty,
        status: publicCase.status,
        setting: publicCase.setting,
        currentScorePreview: publicCase.currentScorePreview,
      },
    });
  }),
);

casesRouter.post(
  '/:id/clues/:clueId/discover',
  asyncHandler(async (req, res) => {
    if (!clueIdSchema.safeParse(req.params.clueId).success)
      throw new AppError(404, 'CLUE_NOT_FOUND', 'Clue not found.');
    const doc = await loadCase(req.params.id);
    if (doc.status === 'solved')
      throw new AppError(409, 'CASE_ALREADY_SOLVED', 'This case has already been solved.');
    const clue = doc.clues.find((item) => item.id === req.params.clueId);
    if (!clue) throw new AppError(404, 'CLUE_NOT_FOUND', 'Clue not found.');
    const wasDiscovered = doc.progress.discoveredClueIds.includes(clue.id);
    const filter = { caseId: doc.caseId, status: 'active' };
    if (!wasDiscovered) filter['progress.discoveredClueIds'] = { $ne: clue.id };
    const update = await CaseModel.updateOne(
      filter,
      { $addToSet: { 'progress.discoveredClueIds': clue.id } },
      { timestamps: false },
    );
    let latest;
    if (!update.matchedCount) {
      latest = await CaseModel.findOne({ caseId: doc.caseId }).select('status progress');
      if (!latest) throw new AppError(404, 'CASE_NOT_FOUND', 'Case not found.');
      if (latest.status !== 'active')
        throw new AppError(409, 'CASE_ALREADY_SOLVED', 'This case has already been solved.');
    } else {
      latest = await CaseModel.findOne({ caseId: doc.caseId }).select('progress');
    }
    res.json({
      success: true,
      data: {
        clue: { id: clue.id, text: clue.text },
        progress: {
          cluesDiscovered: latest.progress.discoveredClueIds.length,
          totalClues: doc.clues.length,
        },
        alreadyDiscovered: update.modifiedCount === 0,
      },
    });
  }),
);

casesRouter.post(
  '/:id/hints',
  asyncHandler(async (req, res) => {
    let doc = await loadCase(req.params.id);
    for (let attempt = 0; attempt < 10; attempt++) {
      if (doc.status === 'solved')
        throw new AppError(409, 'CASE_ALREADY_SOLVED', 'This case has already been solved.');
      const hintIndex = doc.progress.hintsUsed;
      const hint = doc.hints[hintIndex];
      if (!hint) throw new AppError(409, 'NO_HINTS_LEFT', 'No hints remain for this case.');
      const updated = await CaseModel.findOneAndUpdate(
        { caseId: doc.caseId, status: 'active', 'progress.hintsUsed': hintIndex },
        { $inc: { 'progress.hintsUsed': 1 } },
        { new: true },
      ).select('hints progress');
      if (updated)
        return res.json({
          success: true,
          data: {
            hint,
            hints: {
              used: updated.hints.slice(0, updated.progress.hintsUsed),
              total: updated.hints.length,
              remaining: updated.hints.length - updated.progress.hintsUsed,
            },
          },
        });
      doc = await loadCase(req.params.id);
    }
    throw new AppError(
      409,
      'HINT_CONFLICT',
      'This case changed while the hint was requested. Please try again.',
    );
  }),
);

casesRouter.post(
  '/:id/accuse',
  asyncHandler(async (req, res) => {
    const input = accuseSchema.safeParse(req.body);
    if (!input.success) throw new AppError(400, 'VALIDATION_ERROR', 'Choose a valid suspect.');
    let doc = await loadCase(req.params.id, true);
    const suspect = doc.suspects.find((item) => item.id === input.data.suspectId);
    if (!suspect)
      throw new AppError(400, 'INVALID_SUSPECT', 'That suspect is not part of this case.');
    for (let attempt = 0; attempt < 10; attempt++) {
      if (doc.status === 'solved')
        throw new AppError(409, 'CASE_ALREADY_SOLVED', 'An accusation has already been submitted.');
      const correct = doc.solution.culpritId === suspect.id;
      const score = calculateScore({
        difficulty: doc.difficulty,
        correct,
        cluesDiscovered: doc.progress.discoveredClueIds.length,
        hintsUsed: doc.progress.hintsUsed,
      });
      const updated = await CaseModel.findOneAndUpdate(
        {
          caseId: doc.caseId,
          status: 'active',
          'progress.hintsUsed': doc.progress.hintsUsed,
          'progress.discoveredClueIds': doc.progress.discoveredClueIds,
        },
        {
          $set: {
            status: 'solved',
            accusation: { suspectId: suspect.id, correct, at: new Date() },
            score,
            expiresAt: null,
          },
        },
        { new: true },
      );
      if (updated)
        return res.json({
          success: true,
          data: {
            correct,
            score,
            culprit: {
              id: doc.solution.culpritId,
              name: doc.suspects.find((x) => x.id === doc.solution.culpritId).name,
            },
            resultUrl: `/case/${doc.caseId}/result`,
          },
        });
      doc = await loadCase(req.params.id, true);
    }
    throw new AppError(
      409,
      'CASE_STATE_CONFLICT',
      'The case changed while you were making an accusation. Please try again.',
    );
  }),
);

casesRouter.get(
  '/:id/result',
  asyncHandler(async (req, res) => {
    const doc = await loadCase(req.params.id, true);
    if (doc.status !== 'solved')
      throw new AppError(
        403,
        'RESULT_NOT_AVAILABLE',
        'Submit your accusation to reveal the result.',
      );
    const culprit = doc.suspects.find((item) => item.id === doc.solution.culpritId);
    res.json({
      success: true,
      data: {
        verdict: doc.accusation.correct ? 'correct' : 'incorrect',
        accusedSuspectId: doc.accusation.suspectId,
        culprit: { id: culprit.id, name: culprit.name, role: culprit.role },
        motive: doc.solution.motive,
        method: doc.solution.method,
        explanation: doc.solution.explanation,
        keyClues: doc.solution.keyClueIds
          .map((id) => doc.clues.find((clue) => clue.id === id))
          .filter(Boolean)
          .map(({ id, text, evidenceId }) => ({ id, text, evidenceId })),
        allClues: doc.clues.map(({ id, text, kind, evidenceId }) => ({
          id,
          text,
          kind,
          evidenceId,
        })),
        score: doc.score,
        difficulty: doc.difficulty,
        title: doc.title,
      },
    });
  }),
);

export async function getAsset(assetId) {
  const asset = await AssetModel.findOne({ assetId }).select('contentType data kind');
  if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'Evidence file not found.');
  return asset;
}
