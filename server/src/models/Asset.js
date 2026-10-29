import mongoose from 'mongoose';
const AssetSchema = new mongoose.Schema(
  {
    assetId: { type: String, unique: true, index: true },
    contentType: String,
    data: Buffer,
    size: Number,
    kind: String,
    caseId: String,
  },
  { timestamps: true },
);
export const AssetModel = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
