import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAsset } from './cases.routes.js';
export const assetsRouter = Router();
assetsRouter.get(
  '/:assetId',
  asyncHandler(async (req, res) => {
    const asset = await getAsset(req.params.assetId);
    res.set({
      'Content-Type': asset.contentType,
      'Content-Length': asset.data.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    if (asset.kind === 'upload') res.set('Content-Disposition', 'attachment');
    res.send(asset.data);
  }),
);
