# Project decisions

- The app is implemented as a mock-mode Next.js build that demonstrates the full mystery flow using deterministic fixture data, matching the spec's milestone order while staying runnable without external Gemini credentials.
- Difficulty and tone defaults are modeled as `medium` and `realistic` in the landing form.
- Scenario length is kept in `lib/config.ts` and defaults to the spec: 10 to 1,000 characters.
- Pasted text evidence is limited to 10,000 characters to bound multipart requests; the spec does not define a text-proof limit.
- The culprit is hidden from browser-side payloads until accusation submission; the public case data intentionally omits the culprit from all pre-accusation responses.
- Generation jobs and cases are held in a server-side in-memory registry for this local mock milestone; browser localStorage is not used as the source of truth for public case retrieval.
- `USE_MOCK_GEMINI=true` uses deterministic text checks, image-signature validation, and fixture cases without network calls. Real mode sends user text and inline image data to Gemini for safety review and Stage 1 established-fact extraction.
