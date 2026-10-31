# AI Mystery Room

AI Mystery Room is a fictional detective game. Describe an incident, inspect chat logs, photos, and CCTV records, find clues, request hints, and make one final accusation. The server validates and stores each case and keeps its solution private until the accusation is submitted.

## Local setup

Requirements: Node.js 20 or newer, npm, and MongoDB running locally or an Atlas connection string.

```sh
npm install
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Set the MongoDB connection string in the server environment. For a local demo without Gemini, keep `USE_MOCK_AI=true`. For Gemini generation, set `USE_MOCK_AI=false` and configure `GEMINI_API_KEY` on the server. Never put the Gemini key in a client variable.

PowerShell copy commands:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Start the app from the repository root:

```sh
npm run dev
```

The Vite client runs at <http://localhost:5173> and the API at <http://localhost:5000>. The server must be able to connect to MongoDB before it starts listening. Check that connection with:

```sh
npm run db:check --prefix server
```

## Environment variables

Server settings are listed in `server/.env.example`:

| Variable | Purpose | Default or example |
| --- | --- | --- |
| `PORT` | API listen port; supplied by some hosts | `5000` locally |
| `NODE_ENV` | Runtime mode; production requires Gemini configuration unless mock mode is enabled | `development` |
| `MONGODB_URI` | MongoDB connection string | Local MongoDB example in `.env.example` |
| `GEMINI_API_KEY` | Server side Gemini credential | Required for production |
| `GEMINI_TEXT_MODEL` | Main case generation model | `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | Backup model for busy or timed out requests | `gemini-2.5-flash-lite` |
| `GEMINI_IMAGE_MODEL` | Evidence image and CCTV frame model | `gemini-2.5-flash-image` |
| `GEMINI_TIMEOUT_MS` | Timeout for each Gemini generation request | `120000` |
| `CLIENT_URL` | Exact allowed browser origin for CORS; trailing slashes are removed | `http://localhost:5173` |
| `ENABLE_VIDEO` | Optional video generation flag | `false` |
| `USE_MOCK_AI` | Use the built-in fictional generator instead of Gemini | `false` in the example; set `true` for a local mock |

Client configuration is in `client/.env.example`:

| Variable | Purpose | Local example |
| --- | --- | --- |
| `VITE_API_URL` | Public API base URL used by the browser | `http://localhost:5000` |

Only `VITE_API_URL` belongs in the client environment. Keep `GEMINI_API_KEY` and the MongoDB connection string on the server.

## Tests and builds

```sh
npm test
npm run lint
npm run build
npm run build --prefix client
```

The server tests use a mock database and the built-in case fixture; they do not require a live Gemini request. The client lint command checks the client source. The build command creates the Vite production bundle in `client/dist`.

## Deploy without a credit card

### MongoDB Atlas

Create a free Atlas cluster and a database user, then copy the connection string into the backend host's `MONGODB_URI` setting. In Atlas Network Access, allow the backend host's outbound IP addresses when it publishes them. If the host has no fixed egress IP, Atlas may require `0.0.0.0/0`; use a strong database password and keep the URI private.

### Docker server host

Choose a free host that builds Docker containers from a GitHub repository. Configure the service with:

- Repository root directory: `server`
- Dockerfile: `Dockerfile`
- Port: `5000` (the server also reads the host's `PORT` variable)
- Runtime variables: `PORT`, `NODE_ENV`, `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_IMAGE_MODEL`, `GEMINI_TIMEOUT_MS`, `CLIENT_URL`, `ENABLE_VIDEO`, and `USE_MOCK_AI`

Use the placeholders in `server/.env.example` as a reference. Set `NODE_ENV=production`, `USE_MOCK_AI=false`, and provide the Atlas URI and Gemini key. Keep secrets in the host's environment settings, never in the repository or client.

### Vercel client

Import the repository into Vercel and set the project root directory to `client`. Use the Vite framework preset and set `VITE_API_URL` to the deployed server origin, without a trailing path. `client/vercel.json` rewrites application routes to `/index.html` so refreshes on case pages work. A production build without `VITE_API_URL` displays a configuration error instead of calling localhost.

After Vercel gives you the final site URL, set the server's `CLIENT_URL` to that exact origin and redeploy the server. Check `https://your-server-host/api/health`, then create and solve a mystery, inspect clues, request hints, refresh the case page, and confirm the result score. The public case response must not contain the solution or hidden clue classifications.

`render.yaml` remains in the repository for anyone who chooses Render; Render is optional for this setup.

## Privacy and safety

Cases are fictional and accessible to anyone who has the case UUID. Before accusation, the API returns whitelisted public fields and omits the solution, clue kinds, suspect targets, and generation prompts. Uploads are limited to PNG, JPG, WEBP, and plain text; they are served as downloads with `nosniff`.
