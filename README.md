# Check Ticket

Check Ticket is a React and Node.js web app for checking Vietnamese lottery tickets. It lets users enter ticket information manually or scan ticket images with their own Gemini or OpenAI API key, then compares the ticket number with lottery draw results.

The project includes a Vite frontend, an Express API server, configurable lottery result providers, account history, statistics, and optional production storage with TiDB/MySQL.

## Main Features

- Manual ticket checking by province, draw date, ticket number, and optional series.
- Single-image ticket scanning with Gemini or OpenAI.
- Batch ticket checking for up to 50 tickets per API request.
- Batch image scanning, limited to 20 selected images in the UI.
- Latest draw result panel by Vietnamese lottery region.
- Guest mode and optional Google Identity sign-in.
- Ticket history with spending, winning amount, quantity, and source URL.
- Monthly and lifetime statistics with daily and monthly trends.
- Local SQLite storage by default.
- TiDB/MySQL storage for production deployments.
- Render deployment configuration through `render.yaml`.

## Tech Stack

- Frontend: React 19, React Router, Vite, Tailwind CSS
- Backend: Express 5 on Node.js 22
- Local database: SQLite through `better-sqlite3`
- Production database: TiDB/MySQL through `mysql2`
- AI OCR providers: Gemini and OpenAI
- Lottery result provider: Minh Ngoc by default, with support for custom JSON APIs

## Project Structure

```text
src/
  App.tsx                         Main React app and route wiring
  config/constants.ts             Frontend runtime constants and province list
  services/apiClient.ts           Frontend API client
  features/check/                 Ticket check, scan, batch, and latest-results UI
  features/account/               History and statistics UI
  features/home/                  Home and donation sections
  components/                     Shared UI components
  layout/                         Navigation and layout pieces

server/
  index.ts                        Express API server
  env.ts                          Loads .env into process.env
  lottery/checkTicket.ts          Ticket normalization and prize matching
  lottery/providers/              Lottery provider configuration and parsers
  scan/                           AI OCR orchestration
  scan/providers/                 Gemini and OpenAI clients
  storage/historyStore.ts         SQLite or TiDB/MySQL history storage
  scripts/                        Demo seed and clear scripts

public/donate/                    Donation QR images
render.yaml                       Render deployment blueprint
```

## Requirements

- Node.js 22.x
- npm
- Optional: Gemini API key or OpenAI API key for image scanning
- Optional: Google OAuth Client ID for real Google sign-in
- Optional: TiDB/MySQL database for production history storage

## Quick Start

Install dependencies:

```bash
npm install
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Start both frontend and backend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:4000
```

## Local Environment File

The current `.env.example` is:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-4o-mini

VITE_GOOGLE_CLIENT_ID=
STORAGE_DRIVER=
TIDB_SSL=


DATABASE_URL=
```

For normal local development, you can keep it exactly like this. With these values:

- The backend starts on port `4000`.
- The frontend runs on Vite port `5173`.
- Vite proxies `/api` and `/sample-data` to `http://localhost:4000`.
- The app uses local SQLite because `STORAGE_DRIVER` and `DATABASE_URL` are empty.
- Google sign-in falls back to the demo email prompt because `VITE_GOOGLE_CLIENT_ID` is empty.
- Gemini uses `gemini-2.5-flash`.
- OpenAI uses `gpt-4o-mini`.

Important: Gemini/OpenAI API keys are not stored in `.env`. Users enter their AI key in the UI when scanning tickets. The backend receives that key only for the scan request.

## Environment Variables

| Variable | Used by | Description |
| --- | --- | --- |
| `PORT` | Backend | Express server port. Default: `4000`. |
| `CLIENT_ORIGIN` | Backend | CORS origin for the frontend. Use `http://localhost:5173` locally. |
| `VITE_API_BASE` | Frontend | Optional API base URL. Leave empty locally so Vite proxy handles `/api`. |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google Identity Services client ID. Empty value enables demo email login. |
| `GEMINI_MODEL` | Backend | Gemini model for OCR scan requests. |
| `OPENAI_MODEL` | Backend | OpenAI model for OCR scan requests. |
| `SQLITE_PATH` | Backend | Optional custom SQLite database path. |
| `STORAGE_DRIVER` | Backend | Empty means SQLite. Use `tidb` or `mysql` for TiDB/MySQL. |
| `DATABASE_URL` | Backend | TiDB/MySQL connection URL. Also enables TiDB/MySQL storage when set. |
| `TIDB_SSL` / `MYSQL_SSL` | Backend | Set to `true` for SSL database connections. |
| `TIDB_SSL_REJECT_UNAUTHORIZED` | Backend | Set to `false` only if your DB certificate validation requires it. |
| `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE` | Backend | Alternative TiDB connection settings if `DATABASE_URL` is not used. |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` | Backend | Alternative MySQL connection settings if `DATABASE_URL` is not used. |
| `TIDB_CONNECTION_LIMIT` | Backend | Database pool connection limit. Default: `5`. |
| `TIDB_CONNECT_TIMEOUT_MS` | Backend | Database connection timeout. Default: `10000`. |
| `XOSO_API_KEY` | Backend | Optional key for JSON providers that declare `requiredEnv: "XOSO_API_KEY"`. |

## Available Scripts

```bash
npm run dev          # Run backend and frontend together
npm run dev:client   # Run only Vite frontend
npm run dev:server   # Run only Express backend with Node watch mode
npm run build        # Build frontend into dist/
npm run preview      # Preview the built frontend
npm run start        # Start the Express server for production
npm run typecheck    # Run TypeScript without emitting files
npm run seed:demo    # Add demo ticket history into SQLite
npm run seed:clear   # Remove demo ticket history from SQLite
```

## How the App Works

1. A user enters ticket details manually or uploads a ticket image.
2. If the user scans an image, the frontend sends the image, selected provider, and user-entered API key to `/api/scan-ticket`.
3. The backend calls Gemini or OpenAI and asks for JSON containing `province`, `drawDate`, `ticketNumber`, and `series`.
4. The backend normalizes the ticket number to the last 6 digits.
5. The backend fetches the draw result for the ticket province and date.
6. The ticket number is matched against prize numbers by suffix.
7. If history saving is enabled, the result is saved for the current guest/demo/Google user.

## Frontend Routes

- `/` - Home page and donation panel
- `/check` - Single ticket scan/check, batch ticket check, and latest draw results
- `/account` - Login, ticket cost settings, history, filters, and statistics

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/scan-ticket` | Scan one ticket image with Gemini or OpenAI |
| `POST` | `/api/check-ticket` | Check one ticket |
| `POST` | `/api/check-tickets-batch` | Check up to 50 tickets |
| `GET` | `/api/stats` | Read stats, trends, and recent history |
| `POST` | `/api/history/clear` | Clear all history for one user |
| `POST` | `/api/history/delete` | Delete selected history records |
| `POST` | `/api/history/quantity` | Update ticket quantity and recalculate amounts |
| `GET` | `/api/draw-results/today` | Fetch latest results by region |
| `POST` | `/api/gemini-models` | List Gemini models available for a user key |
| `POST` | `/api/debug/gemini-ping` | Debug Gemini connectivity |

## Ticket Matching Logic

Ticket normalization happens in `server/lottery/checkTicket.ts`.

- `province` is required.
- `drawDate` is required and should be `YYYY-MM-DD`.
- `ticketNumber` is required and is normalized to digits only, then the last 6 digits are used.
- `series` is optional.

Prize matching uses suffix matching. For example, ticket `123456` matches prize number `56`, `3456`, or `123456`.

## AI Scanning

Scanning is implemented in:

```text
server/scan/scanTicketImage.ts
server/scan/providers/gemini.ts
server/scan/providers/openai.ts
```

Supported providers:

- `gemini`
- `openai`

Default models:

- Gemini: `gemini-2.5-flash`
- OpenAI: `gpt-4o-mini`

The expected OCR output is JSON:

```json
{
  "province": "Dong Nai",
  "drawDate": "2026-05-20",
  "ticketNumber": "123456",
  "series": "AB"
}
```

If Gemini reports that the configured model is unavailable, use the `/api/gemini-models` endpoint from the app or call Gemini directly:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_API_KEY"
```

Then choose a model that supports `generateContent` and update `GEMINI_MODEL`.

## Lottery Result Providers

Provider configuration is stored in:

```text
server/lottery/providers/lotteryApis.json
```

The first configured provider is a wildcard Minh Ngoc provider:

```json
{
  "province": "*",
  "provider": "minhngoc"
}
```

Because it uses `province: "*"`, it is used for supported provinces unless you change the order or configuration. The Minh Ngoc parser builds URLs like:

```text
https://www.minhngoc.net.vn/ket-qua-xo-so/{region}/{province-slug}/DD-MM-YYYY.html
```

It then parses the HTML result table into normalized prize data. This does not require an API key, but it depends on Minh Ngoc page structure.

The config file also contains examples for:

- a JSON API provider using `XOSO_API_KEY`
- sample-data providers for local JSON result files

Custom JSON provider example:

```json
{
  "province": "Dong Nai",
  "aliases": ["Dong Nai"],
  "url": "https://example.com/api/results?province={province}&date={date}",
  "headers": {
    "X-API-Key": "{env:XOSO_API_KEY}"
  },
  "dataPath": "data",
  "prizePath": "prizes"
}
```

Supported placeholders:

- `{province}`
- `{provinceSlug}`
- `{date}`
- `{ticketNumber}`
- `{env:ENV_VAR_NAME}`

Accepted prize array shape:

```json
[
  { "prize": "Special prize", "number": "123456" },
  { "prize": "Eighth prize", "numbers": ["56"] }
]
```

Accepted prize object shape:

```json
{
  "special": ["123456"],
  "eighth": ["56"]
}
```

## Storage

### SQLite, Default Local Storage

When `STORAGE_DRIVER` and `DATABASE_URL` are empty, the app uses SQLite.

Default database path:

```text
server/data/check-ticket.sqlite
```

The server creates the database and tables automatically. The main tables are:

- `users`
- `ticket_checks`

Use a custom SQLite path:

```env
SQLITE_PATH=C:/data/check-ticket.sqlite
```

### TiDB/MySQL Production Storage

Set `STORAGE_DRIVER` to `tidb` or `mysql`, and provide `DATABASE_URL`:

```env
STORAGE_DRIVER=tidb
TIDB_SSL=true
DATABASE_URL=mysql://user:password@host:4000/database
```

The app also switches to TiDB/MySQL automatically if `DATABASE_URL`, `TIDB_HOST`, or `MYSQL_HOST` is set.

The server creates the required schema automatically on first use.

## Demo History Data

Seed demo history into the SQLite database:

```bash
npm run seed:demo
```

Clear seeded demo history:

```bash
npm run seed:clear
```

Demo records use IDs that start with `demo-`.

## Google Sign-In

Google sign-in is optional.

If `VITE_GOOGLE_CLIENT_ID` is empty, the app uses a simple prompt where the user can enter an email. This is useful for local testing because the app can still group history by user ID.

To enable real Google Identity Services:

1. Create a Web OAuth Client ID in Google Cloud Console.
2. Add the local origin:

```text
http://localhost:5173
```

3. Add your deployed origin if you deploy the app.
4. Set:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

5. Restart the frontend dev server or rebuild for production.

## Local Development Notes

The Vite config proxies backend requests:

```text
/api         -> http://localhost:4000
/sample-data -> http://localhost:4000
```

That means local development normally does not need `VITE_API_BASE`.

If you run the frontend and backend on separate public URLs, set:

```env
VITE_API_BASE=https://your-api-host.example.com
CLIENT_ORIGIN=https://your-frontend-host.example.com
```

## Using ngrok

Start the app:

```bash
npm run dev
```

Tunnel the frontend only:

```bash
ngrok http 5173
```

Open the HTTPS ngrok URL. The frontend will still call `/api`, and Vite will proxy it to `localhost:4000`.

## Production Build

Build the frontend:

```bash
npm run build
```

Start the server:

```bash
npm run start
```

When `dist/` exists, Express serves the built frontend and falls back to `dist/index.html` for client-side routes.

## Deploying to Render

The repository includes `render.yaml`:

```yaml
buildCommand: npm ci && npm run build
startCommand: npm start
healthCheckPath: /api/health
```

The Render blueprint sets:

```text
NODE_VERSION=22.15.0
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-4o-mini
STORAGE_DRIVER=tidb
TIDB_SSL=true
```

You must provide:

```text
DATABASE_URL
VITE_GOOGLE_CLIENT_ID
```

`VITE_GOOGLE_CLIENT_ID` is only required if you want real Google sign-in. `DATABASE_URL` is required for the included Render TiDB/MySQL setup.

## Security Notes

- Do not commit real database credentials.
- Do not commit AI provider API keys.
- AI API keys are entered by users in the UI and are not stored by the backend.
- User-entered AI keys still pass through the backend during scan requests.
- Add rate limiting before exposing the app publicly.
- Add abuse protection if public users can trigger AI scans.
- Use persistent storage in production.
- Minh Ngoc scraping can break if the source website changes its HTML.

## Troubleshooting

### Frontend cannot connect to backend

Make sure both dev processes are running:

```bash
npm run dev
```

Open the Vite URL:

```text
http://localhost:5173
```

Do not open `http://localhost:4000` for the frontend during development.

### SQLite is not being used

Check that these values are empty:

```env
STORAGE_DRIVER=
DATABASE_URL=
TIDB_HOST=
MYSQL_HOST=
```

If any of them are set, the app may switch to TiDB/MySQL mode.

### Gemini scan fails

- Verify the user-entered Gemini API key.
- Confirm `GEMINI_MODEL` exists for that key.
- Try `/api/gemini-models` or the Gemini model list curl command.

### OpenAI scan fails

- Verify the user-entered OpenAI API key.
- Confirm `OPENAI_MODEL` supports image input and JSON output.
- Check network/firewall/VPN access from the backend.

### Lottery results fail

- Confirm the province name is supported by the Minh Ngoc route map.
- Confirm the draw date uses `YYYY-MM-DD`.
- Check whether Minh Ngoc has a result page for that province and date.
- If using a JSON provider, confirm `lotteryApis.json`, `dataPath`, `prizePath`, and required environment variables.
