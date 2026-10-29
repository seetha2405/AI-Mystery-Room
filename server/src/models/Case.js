import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true, index: true, required: true },
    premise: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    status: {
      type: String,
      enum: ['generating', 'active', 'solved', 'failed'],
      default: 'generating',
    },
    title: String,
    story: String,
    setting: { location: String, date: String, incidentTime: String },
    suspects: [mongoose.Schema.Types.Mixed],
    evidence: [mongoose.Schema.Types.Mixed],
    clues: [mongoose.Schema.Types.Mixed],
    hints: [mongoose.Schema.Types.Mixed],
    solution: { type: mongoose.Schema.Types.Mixed, select: false },
    progress: {
      discoveredClueIds: { type: [String], default: [] },
      hintsUsed: { type: Number, default: 0 },
    },
    accusation: mongoose.Schema.Types.Mixed,
    score: mongoose.Schema.Types.Mixed,
    expiresAt: Date,
  },
  { timestamps: true, minimize: false },
);
CaseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const CaseModel = mongoose.models.Case || mongoose.model('Case', CaseSchema);
