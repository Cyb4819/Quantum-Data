# Quantum Data — Data Dictionary

This repository contains a Next.js data-dictionary chat UI and two backend services:

- `Data Dictionary/frontend`: Next.js and React interface.
- `data-dictionary-agent`: Spring Boot service for database connection checks, schema extraction, and query execution.
- `Data Dictionary/backend`: FastAPI service for AI interpretation and its own schema-extraction API.

## How chat works

The frontend's `/api/chat` route extracts schema through Spring Boot, then sends the schema and messages to Spring Boot's `/api/chat` endpoint. Spring calls the Python service at `http://localhost:8000/api/ai/query` by default. For a schema-only intent, the AI's text is returned without running a database query. For query intents, Spring executes the generated SQL or MongoDB query and returns results.

Consequently, seeing a conversational response does not by itself prove that a database is connected or queried. The Python AI route can also return a local stub response when `GROQ_API_KEY` is not configured.

## Requirements

- Java 17
- Python and pip
- Node.js and pnpm
- A reachable supported database for schema extraction and query-result flows
- A Groq API key for live AI responses from the Python service (optional for the local stub path)

## Run locally (PowerShell)

Run the services in separate terminals from the repository root.

### 1. Python FastAPI service

```powershell
Set-Location ".\Data Dictionary\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set `GROQ_API_KEY` in the environment (or a `.env` file loaded by the backend) to enable its configured AI provider. The backend also reads database settings described in [Configuration](#configuration).

### 2. Java Spring Boot service

```powershell
Set-Location ".\data-dictionary-agent"
.\mvnw.cmd spring-boot:run
```

Spring Boot listens on port `8081` by default. It calls the Python AI service at `http://localhost:8000`; override `llm.base-url` in Spring configuration if the Python service is elsewhere.

### 3. Next.js frontend

```powershell
Set-Location ".\Data Dictionary\frontend"
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend's `SPRING_API_URL` defaults to `http://localhost:8081`.

## Configuration

### Frontend chat route

The Next.js server reads these environment variables for the selected database:

| Variable | Used for |
| --- | --- |
| `MYSQL_HOST` | MySQL host |
| `MYSQL_PORT` | MySQL port |
| `MYSQL_USER` | MySQL username |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DB` | MySQL database |
| `MONGODB_URI` | MongoDB connection URI |
| `SPRING_API_URL` | Spring Boot base URL; defaults to `http://localhost:8081` |

PostgreSQL connection details are supplied through the UI's selected database configuration. The `/api/db/connect` route tests the connection through Spring Boot; chat separately extracts schema before sending the LLM request.

### Python backend

The Python service recognizes `GROQ_API_KEY` and `MODEL_NAME` for AI. Its extraction endpoints can use `DATABASE_URL`, PostgreSQL settings (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`), MySQL settings (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`), or MongoDB settings (`MONGODB_URI`, `MONGODB_DB`). The backend loads `.env` from `Data Dictionary/backend/.env` or `Data Dictionary/.env` if present.

Do not commit database passwords, connection URIs, or API keys.

## API overview

### Next.js routes

- `POST /api/db/connect`: forwards a database connection check to Spring Boot.
- `POST /api/chat`: extracts schema and proxies chat to Spring Boot.

### Spring Boot routes (`http://localhost:8081`)

- `POST /api/db/connect`: tests a database connection.
- `POST /api/metadata/extract`: extracts schema metadata from configured source(s).
- `POST /api/chat`: asks the Python AI service to interpret the conversation and executes query intents.

### FastAPI routes (`http://localhost:8000`)

- `GET /healthz`: health check.
- `GET /api/extract/all`: extracts schema from the configured PostgreSQL database URL.
- `POST /api/extract/connect`: extracts schema for PostgreSQL, MySQL, or MongoDB connection details.
- `POST /api/ai/query`: interprets a conversation and supplied schema; query execution depends on the request's database type and `execute_query` option.

## Database and response behavior

The Java service has MySQL and PostgreSQL JDBC providers and a MongoDB provider. Metadata extraction requires a reachable configured database. Spring's database connection check closes its test connection after validation; subsequent extraction and query operations establish their own connections.

The chat model can classify a request as schema-related or query-related. A schema response can be generated from the prompt and schema context without querying rows. Query intents require a working database connection. Without `GROQ_API_KEY`, the Python AI route can return a stub message, which is not a database result or live model response.

## Tests

Python backend tests are under `Data Dictionary/backend/tests` and can be run from that directory:

```powershell
pytest
```

Java tests are under `data-dictionary-agent/src/test`; run them with:

```powershell
Set-Location ".\data-dictionary-agent"
.\mvnw.cmd test
```
