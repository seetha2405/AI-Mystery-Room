export const config = {
  scenarioMinLength: 10,
  scenarioMaxLength: 1000,
  maxProofFiles: 5,
  maxProofFileBytes: 5 * 1024 * 1024,
  allowedProofMimeTypes: ['image/png', 'image/jpeg'] as const,
  get mockGemini() {
    return process.env.USE_MOCK_GEMINI === 'true';
  },
  get textModel() {
    return process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest';
  },
};

export type AllowedProofMimeType = (typeof config.allowedProofMimeTypes)[number];