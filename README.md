<div align="center">

# ⏱️ QueueFlow

### Real-time queues, appointments and reservations for hospitals, shops and hotels, with **Wayzen**, an AI agent that searches, cites its sources and books only after you confirm.

[![Live Demo](https://img.shields.io/badge/Live_Demo-queueflow--dvqt.onrender.com-6366f1?style=for-the-badge&logo=render&logoColor=white)](https://queueflow-dvqt.onrender.com)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

![Python](https://img.shields.io/badge/Python_3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16_+_pgvector-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?logo=googlegemini&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

**[Live demo](https://queueflow-dvqt.onrender.com)** · **[Architecture](docs/ARCHITECTURE.md)** · **[API](docs/API.md)** · **[Security](docs/SECURITY.md)** · **[Verification](docs/VERIFICATION.md)**

</div>

---

## 📊 At a glance

| Metric | Result |
|---|---|
| Retrieval quality (Wayzen, 12-question eval set, k=5) | **hit@1 0.75 · hit@5 1.00 · MRR 0.836** |
| Backend tests (pytest, real PostgreSQL) | **137 passed**, 0 failed |
| Frontend tests (Vitest + Testing Library) | **16 passed** |
| Browser end-to-end run (Playwright, desktop + mobile) | **16 / 16 steps passed** |
| Security lint (ruff with bandit rules) · `pip-audit` · `npm audit` | clean · 0 known vulnerabilities · 0 vulnerabilities |
| Concurrency | **6 concurrent customers on one slot → exactly 1 wins**; 6 concurrent attempts on the last hotel room → exactly 1 wins |
| Multi-instance realtime | a booking on instance A reached a WebSocket held by instance B via Redis Pub/Sub |

Every number above is recorded, with how it was measured, in [docs/VERIFICATION.md](docs/VERIFICATION.md).

---

## ✨ Highlights

| | |
|---|---|
| 🤖 **Wayzen AI agent** | LLM tool calling with 8 allowlisted tools, up to 5 tool rounds, 10-turn context memory and cited answers |
| 🔎 **Semantic search over a changing index** | Heading-aware chunking, incremental re-indexing by content hash, pgvector cosine search with per-user access filters |
| ✅ **Human-in-the-loop actions** | The model can only *prepare* a booking; nothing is booked until the user presses **Confirm** |
| 🧪 **Measured, not guessed** | Retrieval evals (hit@k, MRR), prompt-injection tests, and per-answer logs of chunks, scores, tool calls, model and latency |
| ⚡ **Live queue position** | WebSocket updates fanned out across instances through Redis Pub/Sub |
| 🔒 **No double booking** | Row locks plus PostgreSQL `btree_gist` exclusion constraints on time ranges |
| 🛡️ **Secure by default** | Argon2id passwords, cookie sessions with CSRF, rate limits and a least-privilege database role |
| 🔌 **Pluggable LLMs** | One interface for Google Gemini (Gemini API or Vertex AI), Anthropic and any OpenAI-compatible API |

---

## 🧭 What it does

- **Customers** browse hospitals (by specialization and doctor), shops (by service and staff member) and hotels; book real free slots or rooms; get a booking reference and queue token; follow their live position on the day; get an in-app alert when their turn is about 20 minutes away; and cancel or reschedule within policy.
- **Staff** run their assigned venues' queues (check in, start, complete, no-show, delays, pause) and the hotel front desk.
- **Administrators** manage venues, services, doctors and staff, schedules, room types, staff access and roles.
- **Wayzen** answers questions about venues and policies with cited sources, finds free slots, quotes hotel prices and prepares bookings for the user to confirm.

Venues created by the seed script are fictional and labelled **Sample** everywhere.

---

## 🏗️ Architecture

```mermaid
flowchart LR
  U[Browser · React SPA] -- HTTPS + WebSocket --> A[FastAPI]
  A --> P[(PostgreSQL 16<br/>pgvector · btree_gist)]
  A <--> R[(Redis 7<br/>pub/sub · locks · rate limits)]
  A --> W[Wayzen agent]
  W -->|retrieve| P
  W -->|generate + tools| L[LLM provider<br/>Gemini · Anthropic · OpenAI-compatible]
```

The SPA and the API are served from one origin, so session cookies stay first-party.

### 🤖 How Wayzen works

```mermaid
flowchart LR
  Q[User message] --> E[Embed query]
  E --> S[pgvector cosine search<br/>+ access filter in SQL]
  S --> T[Score threshold ·<br/>max 2 chunks per document]
  T --> G[LLM with system prompt,<br/>last 10 turns, cited sources]
  G -->|tool call| X[8 allowlisted tools]
  X --> G
  G --> C[Cited answer]
  X -->|prepare_*| PA[Pending action]
  PA -->|user presses Confirm| B[Booking service]
```

1. **Ingest.** Markdown help articles and generated documents for every active venue are normalised, split into heading-aware chunks (≤ 900 characters), embedded and stored in pgvector. Ingestion is incremental by content hash, versions increment, and admin edits re-index the venue in the background.
2. **Retrieve.** The query embedding is matched by cosine similarity in SQL, with the user's access level applied in the same query (public, staff-only, or private to the owner), then filtered by a score threshold and limited to two chunks per document.
3. **Generate.** The model sees a fixed system prompt, the last ten turns and the retrieved documents, marked as untrusted data. It cites sources as `[S1]`, and only cited sources are returned.
4. **Act safely.** *Prepare* tools re-check availability and store a pending action with a server-built summary and server prices. A CSRF-protected **Confirm** endpoint claims it atomically (single use, 15-minute expiry). The model has no tool that can confirm.
5. **Observe.** Every answer logs its retrieved chunk ids, scores, tool calls, model and latency.

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#wayzen).

---

## 🛠️ Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router; Vitest + Testing Library |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, Argon2id |
| Data | PostgreSQL 16 with pgvector and btree_gist; Redis 7 (rate limits, locks, pub/sub) |
| Realtime | WebSockets, fanned out across instances through Redis Pub/Sub |
| AI | Embeddings (offline lexical or any OpenAI-compatible API); LLM via Google Gemini, Anthropic or OpenAI-compatible APIs |
| Ops | Docker Compose, nginx (non-root) reverse proxy, GitHub Actions CI, Render |

---

## 🚀 Quick start (Docker Compose)

```sh
cp .env.example .env
# Fill the three secrets:
sed -i "s/^JWT_SECRET_KEY=.*/JWT_SECRET_KEY=$(openssl rand -hex 32)/; \
        s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/; \
        s/^APP_DB_PASSWORD=.*/APP_DB_PASSWORD=$(openssl rand -hex 24)/" .env
# Optionally set INITIAL_ADMIN_EMAIL / _NAME / _PASSWORD in .env for a first admin.
docker compose up -d --build
curl http://localhost:8080/api/health
```

Open http://localhost:8080. On start the backend applies migrations, creates the first admin (if configured), seeds sample venues (`SEED_SAMPLE_DATA=true`) and indexes Wayzen's knowledge base. Only port 8080 is published publicly; PostgreSQL, Redis and the backend listen on 127.0.0.1.

<details>
<summary><b>Useful commands</b></summary>

```sh
docker compose exec backend python -m app.seed                          # sample venues (idempotent)
docker compose exec backend python -m app.seed --assign-staff EMAIL     # give a STAFF account the sample venues
docker compose exec backend python -m app.provision_user --email E --name 'N' --role STAFF
docker compose exec backend python -m app.rag.ingest                    # re-index knowledge
docker compose exec backend python -m app.rag.evaluate                  # retrieval metrics
./scripts/backup_db.sh                                                   # gzip pg_dump, keeps 7
```

> **Upgrading a database volume from QueueFlow 1.x?** The app now connects as a least-privilege role. See "Existing database volume" in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

</details>

<details>
<summary><b>Local development without Docker</b></summary>

Requires Python 3.12, Node 22, PostgreSQL 16 with the `vector` and `btree_gist` extensions, and Redis.

```sh
# Backend
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # set DATABASE_URL, JWT_SECRET_KEY
alembic upgrade head
python -m app.seed && python -m app.rag.ingest
uvicorn app.main:app --reload   # http://localhost:8000, docs at /docs

# Frontend (separate terminal)
cd frontend
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm ci && npm run dev           # http://localhost:5173
```

</details>

### 🔑 Enabling Wayzen's AI answers

Without a model provider Wayzen runs in **limited mode**: it retrieves and cites the matching help articles but writes no generated text. To enable generation, set one of:

```sh
LLM_PROVIDER=gemini             LLM_MODEL=<model id>  LLM_API_KEY=<key>   # Gemini API or Vertex AI key
LLM_PROVIDER=anthropic          LLM_MODEL=<model id>  LLM_API_KEY=<key>
LLM_PROVIDER=openai_compatible  LLM_MODEL=<model id>  LLM_API_KEY=<key>  LLM_BASE_URL=<url>   # OpenAI, Ollama, vLLM...
```

For semantic retrieval also set `EMBEDDING_PROVIDER=openai_compatible` and `EMBEDDING_MODEL`, then re-index. Keys stay on the server. Details: [docs/ARCHITECTURE.md#wayzen](docs/ARCHITECTURE.md#wayzen).

---

## 🧪 Testing

CI runs on every push to `main` and on every pull request: backend tests on PostgreSQL + pgvector and Redis, ruff (with bandit security rules), `pip-audit`, and frontend lint, type-check and tests.

```sh
# Backend: needs a disposable PostgreSQL database with pgvector (all tables are reset)
cd backend
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/queueflow_test pytest -q
ruff check app && pip-audit -r requirements.txt

# Frontend
cd frontend && npm run lint && npm run typecheck && npm test && npm run build

# Browser end-to-end walkthrough against a running stack
npm install --no-save playwright && npx playwright install chromium
ADMIN_EMAIL=... ADMIN_PASSWORD=... node e2e/run.mjs http://localhost:8080
```

The tests cover booking rules, race conditions, access control, Wayzen's confirmation flow, tool authorisation and prompt injection from a poisoned document. Results for this release: [docs/VERIFICATION.md](docs/VERIFICATION.md).

---

## 📚 Documentation

| Doc | What's inside |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Backend layout, booking engine, realtime hub, Wayzen pipeline |
| [API.md](docs/API.md) | Endpoints (live OpenAPI at `/docs`) |
| [schema.md](docs/schema.md) | Data model, constraints and indexes |
| [SECURITY.md](docs/SECURITY.md) | Threat model, sessions, CSRF, rate limits, database roles |
| [VERIFICATION.md](docs/VERIFICATION.md) | What was tested and the recorded results |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) · [AWS_EC2.md](docs/AWS_EC2.md) | Render and EC2 deployment guides |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) · [CHANGES.md](docs/CHANGES.md) | Common fixes and the change log |

---

## ⚖️ Limits (honest summary)

Payments are not processed (hotel totals and fees are payable at the venue). Email is used only for password reset and only when SMTP is configured; there is no SMS. Generated Wayzen answers were exercised with a scripted test model, not a live LLM. The Docker images and the EC2 guide were not executed in the environment used for this release. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/VERIFICATION.md](docs/VERIFICATION.md) for the full list.

---

## 👤 Author

**Priyam Thakur** · B.E. Computer Science & Engineering, B.M.S. College of Engineering, Bengaluru
[GitHub](https://github.com/priyamthakur275) · [LinkedIn](https://linkedin.com/in/priyamthakur275) · [Email](mailto:priyamthakur275@gmail.com)

Licensed under the [MIT License](LICENSE).
