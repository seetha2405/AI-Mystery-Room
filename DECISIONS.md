# Implementation decisions

- CCTV is represented as generated still frames and a timestamped event log. Live video generation remains disabled as a stretch goal.
- `USE_MOCK_AI=true` defaults to a local deterministic case path so the app can be exercised without a Gemini key. Set it to `false` to use Gemini in a configured environment.
- MongoDB remains the source of truth for cases and their state; the UUID caseId is the sole access token.
- Asset identifiers use UUIDs. Uploaded assets are returned as attachments and set `X-Content-Type-Options: nosniff`.
- The public case payload is constructed with field whitelists. Solution details are selected only for accusation and result operations.
