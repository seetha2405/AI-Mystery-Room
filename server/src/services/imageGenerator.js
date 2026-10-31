import { randomUUID } from 'node:crypto';
import { CaseModel } from '../models/Case.js';
import { AssetModel } from '../models/Asset.js';
import { env } from '../config/env.js';
import { generateImage } from './gemini.service.js';

async function createAsset(caseId, prompt, kind) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const image = await generateImage(prompt);
      const assetId = randomUUID();
      await AssetModel.create({
        assetId,
        contentType: image.contentType,
        data: image.data,
        size: image.data.length,
        kind,
        caseId,
      });
      return assetId;
    } catch (error) {
      console.warn('Gemini image generation attempt failed:', {
        model: env.GEMINI_IMAGE_MODEL,
        attempt: attempt + 1,
        status: error?.status ?? error?.statusCode ?? null,
      });
      if (attempt === 1) throw error;
    }
  }
}
export async function generateCaseImages(caseId) {
  const doc = await CaseModel.findOne({ caseId });
  if (!doc) return;
  const queue = [];
  for (const item of doc.evidence) {
    if (item.type === 'image' && item.image?.imagePrompt)
      queue.push({ item, prompt: item.image.imagePrompt, frame: false });
    if (item.type === 'cctv') {
      item.frameStatus = 'pending';
      for (let i = 0; i < (item.cctv?.framePrompts || []).length; i++)
        queue.push({ item, prompt: item.cctv.framePrompts[i], frame: true, index: i });
    }
  }
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (cursor < queue.length) {
        const job = queue[cursor++];
        try {
          const assetId = await createAsset(caseId, job.prompt, job.frame ? 'frame' : 'evidence');
          if (job.frame) {
            job.item.frameAssetIds ||= [];
            job.item.frameAssetIds[job.index] = assetId;
          } else {
            job.item.assetId = assetId;
            job.item.imageStatus = 'ready';
          }
        } catch {
          if (!job.frame) job.item.imageStatus = 'failed';
        }
      }
    }),
  );
  for (const item of doc.evidence)
    if (item.type === 'cctv') item.frameStatus = item.frameAssetIds?.length ? 'ready' : 'failed';
  for (const item of doc.evidence)
    if (item.type === 'image' && item.imageStatus === 'pending') item.imageStatus = 'failed';
  await doc.save();
}
