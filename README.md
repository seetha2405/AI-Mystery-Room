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
| `PORT` | API listen port; Render supplies this in production | `5000` locally |
| `NODE_ENV` | Runtime mode; production requires the database URI, Gemini key, and client origin | `development` |
| `MONGODB_URI` | MongoDB connection string | Local MongoDB example in `.env.example` |
| `GEMINI_API_KEY` | Server side Gemini credential | Required for production |
| `GEMINI_TEXT_MODEL` | Main case generation model | `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | Backup model for busy or timed out requests | `gemini-2.5-flash-lite` |
| `GEMINI_IMAGE_MODEL` | Evidence image and CCTV frame model | `gemini-2.5-flash-image` |
| `GEMINI_TIMEOUT_MS` | Timeout for each Gemini generation request | `120000` |
| `CLIENT_URL` | Exact allowed browser origin for CORS; trailing slashes are removed | `http://localhost:5173` |
| `USE_MOCK_AI` | Use the built-in fictional generator locally | `true` |
| `ENABLE_VIDEO` | Optional video generation flag | `false` |

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

## Deployment

### MongoDB Atlas

Create a cluster and database user, then allow network access from the backend host. Store the Atlas connection string as `MONGODB_URI` in Render. Keep the username and password private. Verify the connection using the Render service logs and `/api/health` after deployment.

### Render API

Create a web service from this repository using the checked-in `render.yaml`. It sets the root directory to `server`, installs with `npm install`, starts with `node src/index.js`, and checks `/api/health`. Set the unsynchronized values `MONGODB_URI`, `GEMINI_API_KEY`, and `CLIENT_URL` in the Render dashboard. The other model, timeout, mock mode, and runtime values are declared in the blueprint. Render provides `PORT` to the process.

Set `CLIENT_URL` to the exact Vercel origin, for example `https://your-project.vercel.app`. The server strips a trailing slash before applying its single-origin CORS rule.

### Vercel client

Import the repository into Vercel and set the project root directory to `client`. Use the Vite framework preset and set `VITE_API_URL` to the deployed Render API origin, without a trailing path. `client/vercel.json` rewrites application routes to `/index.html` so refreshes on case pages work.

After both services are deployed, confirm `/api/health`, create and solve a mystery, inspect clues, request hints, refresh the case page, and confirm the result score. The public case response must not contain the solution or hidden clue classifications.

## Privacy and safety

Cases are fictional and accessible to anyone who has the case UUID. Before accusation, the API returns whitelisted public fields and omits the solution, clue kinds, suspect targets, and generation prompts. Uploads are limited to PNG, JPG, WEBP, and plain text; they are served as downloads with `nosniff`.
