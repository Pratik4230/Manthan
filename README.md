# Manthan

Source-grounded AI research workspaces (NotebookLM-style). Create a notebook, add sources, chat only against those sources with citations.

## Stack

- Turborepo + Bun
- Next.js App Router (`apps/web`)
- MongoDB Atlas + Atlas Vector Search
- Better Auth, Inngest, ImageKit, Firecrawl
- LangGraph + assistant-ui (Radix) for chat

## Local setup

### 1. Install

```bash
bun install
```

### 2. Environment

Copy `.env.example` → `apps/web/.env` (or repo root if your Turbo/`next` load path expects it) and fill every key:

| Key | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `BETTER_AUTH_URL` | Auth base URL (`http://localhost:3000`) |
| `EMAIL_FROM` | Verified Resend from address |
| `FIRECRAWL_API_KEY` | Web page scrape |
| `IMAGEKIT_PRIVATE_KEY` | File upload signing |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint |
| `INNGEST_DEV` | Set `1` for local Inngest |
| `MONGO_URI` | MongoDB Atlas connection string |
| `NEXT_PUBLIC_APP_URL` | App origin (`http://localhost:3000`) |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Public ImageKit endpoint |
| `OPENAI_API_KEY` | Chat + embeddings |
| `RESEND_API_KEY` | Email verification |

### 3. MongoDB Atlas Vector Search

1. Create an Atlas cluster and database (e.g. `manthan`).
2. Create collection `chunks` (or let the app create it on first write).
3. Create a **Vector Search** index named `vector_index` on `chunks` with:
   - Embedding path matching the LangChain Mongo store field (default `embedding`)
   - Dimensions **3072** (`text-embedding-3-large`)
   - Similarity **cosine**
   - Filter fields: `workspaceId`, `sourceId`
4. Wait until the index status is ready before chatting.

Without this index, ingest may write chunks but retrieval/chat will fail or return empty hits.

### 4. Run

Terminal A — Next.js + Turbo:

```bash
bun run dev
```

Terminal B — Inngest dev server (required for source ingest):

```bash
bun run inngest:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase 1 checklist

You are ready when you can:

1. Sign up / verify email / log in
2. Create a workspace
3. Add a **file**, a **web URL**, and a **YouTube** URL
4. See each source reach **Ready** (with vectors — use **Re-index** if an old Ready source has no embeddings)
5. Chat and get answers with **citation chips**

## Useful scripts

```bash
bun run dev          # turbo dev
bun run inngest:dev  # local Inngest
bun run build
bun run lint
bun run typecheck
```

## Notes

- Chat only uses **enabled** sources with status **ready**.
- Failed ingest: use **Retry** on the source. Ready-but-stale vectors: use **Re-index**.
- Studio shows notebook/source summaries in Phase 1; generated artifacts are Phase 2.
