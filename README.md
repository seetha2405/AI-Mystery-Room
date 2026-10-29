# AI Mystery Room

An AI assisted, fictional detective game. Create a premise, inspect chat records, images and CCTV logs, discover clues, and make one final accusation. The server keeps the case solution private until the result is unlocked.

## Requirements

- Node.js 20 or newer and npm
- MongoDB running locally, or a MongoDB Atlas URI
- Optional: a Gemini API key for generated cases and evidence images

## Local setup

```sh
npm install
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `server/.env`. For a fast local demo, leave `USE_MOCK_AI=true`; this uses a built-in fictional fixture and does not require Gemini. Set `USE_MOCK_AI=false` and provide `GEMINI_API_KEY` to generate cases and images with Gemini. The mock mode is for development only.

Run `npm run dev` from the repository root. The client runs at <http://localhost:5173> and the API at <http://localhost:5000>. MongoDB must be available at the configured `MONGODB_URI`.

## Environment

See [server/.env.example](server/.env.example) and [client/.env.example](client/.env.example). `GEMINI_TEXT_MODEL` and `GEMINI_IMAGE_MODEL` are configurable. The current names in the spec, `gemini-2.5-flash` and `gemini-2.5-flash-image`, are supported by Google's API; review [Google's model list](https://ai.google.dev/gemini-api/docs/models) before production use. Never put the Gemini key in a `VITE_` variable.

## Useful commands

```sh
npm run build
npm test
npm run lint
```

## Deployment

1. Create MongoDB Atlas database and set `MONGODB_URI` in the backend environment.
2. Deploy `server/` to Render or Railway with `npm install` and `npm start`. Set `CLIENT_URL` to the frontend origin, `GEMINI_API_KEY`, model names, and `USE_MOCK_AI=false`. Confirm `/api/health` responds.
3. Deploy `client/` to Vercel with `VITE_API_URL` set to the backend origin. `client/vercel.json` routes app paths to Vite's `index.html`.
4. Set the final frontend origin in backend `CLIENT_URL`, redeploy, and run the manual QA checklist in `SPEC.md`.

No production deployment, public repository push, or live demo was performed from this workspace. Configure external accounts and secrets before publishing. Keep `.env` files out of version control.

## Privacy and safety

Cases contain fictional people and incidents. Each case is accessible to anyone who has its UUID link. Before accusation, case responses are assembled from explicit public fields and do not include the solution, clue classifications, or generation prompts. Uploaded files are limited to PNG, JPG, WEBP, and plain text; they are served with `nosniff` and downloads are attachment-only.
