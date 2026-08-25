# CubbyCare 🧸

Childcare you can trust, all over San Francisco. A trust-first childcare registry built at the SFO hackathon 2026 by **Team Chubby Chick** — specialist swarm track.

**The idea:** trust is earned, verified, and visible. Providers climb a four-tier trust ladder:

| Tier | Badge | How it's earned |
|---|---|---|
| 0 | Unverified | Anyone can register |
| 1 | ID verified | Government ID confirmed (simulated) |
| 2 | Credentialed | Upload a CPR card / ECE degree — **Claude reads and verifies the document** |
| 3 | ★ Licensed | **An agent drives a real browser** through California's live CCL registry to confirm the facility number |

Plus: an AI concierge that searches and books from the live registry, and a **trust-check swarm** — three specialist agents (credentials, state license, reviews) fan out in parallel and a coordinator synthesizes a parent-facing trust report.

**The kicker: the app IS an MCP server.** Web app, REST API, and any MCP client share the same seven tools over one registry.

## Prerequisites

- Node.js 24+ (uses built-in `node:sqlite` — zero DB dependencies)
- Google Chrome (the license-verification agent drives it via Playwright MCP)
- AWS credentials with Amazon Bedrock access in `us-west-2` (Claude Haiku 4.5 + Claude Fable 5)

## Run it

```sh
npm install
npm run dev        # API on :3001, web on :5173 (seeds 24 SF providers on first boot)
```

Phone demo: `npm run web` binds to the LAN — open `http://<your-ip>:5173` on the same wifi, Share → Add to Home Screen (it's a PWA).

## Demo cheatsheet

- **Credential OCR**: register a provider, upload `seed/certs/cpr-cert.png` → badge flips to Credentialed
- **Live license check**: real CCL facility numbers that verify live: `384004665` (Amigos de Presidio Heights), `384001195`, `380506527`. Mock fallback kicks in automatically if the state site is down
- **Swarm**: any provider page → "Run the swarm"
- **Emergency concierge**: "I need backup care near the Mission in the next 2 hours for my 18-month-old"
- **MCP**: `claude mcp add cubbycare -- npx tsx server/mcp.ts` — then ask Claude Code for a Saturday sitter

## How it fits together

```
web app (React PWA) ─┐
Claude Code (MCP) ───┼─→ tools.ts (one tool catalog) → core.ts + SQLite
concierge (Bedrock) ─┘
        specialists: verify.ts (Fable 5 doc OCR) · license.ts (Playwright MCP → ccld.dss.ca.gov)
        swarm.ts: coordinator fans out credentials/license/reviews in parallel → trust report
```

All business logic lives in `server/core.ts`; REST (`api.ts`), MCP (`mcp.ts`), and the concierge (`chat.ts`) are thin wrappers over the shared tool catalog (`tools.ts`).
