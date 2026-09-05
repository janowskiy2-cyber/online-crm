---
name: crm-ai-copilot-engineer
description: >-
  Use this skill when designing, implementing, and optimizing interactive AI Copilots,
  LLM-powered chat assistants, 1-click deal message drafts, objection handling engines,
  lead health scoring, voice dictation, and multi-model failover routers for CRM workflows.
  Enforces zero-downtime deterministic fallbacks and free-tier quota optimization.
---

# CRM AI Copilot Engineer

This skill provides expert patterns, prompt architectures, and production runbooks for embedding interactive Generative AI assistants directly into sales and recruiting CRM workflows.

## 1. Core Principles of CRM Copilots

- **System of Action, Not Just Record:** An AI Copilot must reduce manager cognitive load. It should propose completed drafts, score risks, and suggest the single best next action (NBA), rather than just summarizing.
- **Sub-Second Response Guarantee:** Sales reps and recruiters will abandon features with high latency. All interactive completions must respond in <1000ms.
- **Zero-Downtime Deterministic Fallback:** AI services must NEVER throw a 500 error or crash the UI if Google AI Studio, OpenAI, or network connections are slow or exhausted. Every AI endpoint must feature a deterministic fallback function (allbackFn()) with zero latency.
- **Human-in-the-Loop:** The AI generates recommendations and drafts into editable input boxes. The human manager retains the final click to send or save.

## 2. Multi-Model Free-Tier Cascade Architecture

Google AI Studio provides substantial free quotas across modern Flash and Flash-Lite models. Always orchestrate them in a priority cascade via ModelRouterService:

1. gemini-2.5-flash: High-fidelity reasoning (15 RPM / 1,500 RPD free)
2. gemini-3.5-flash: Advanced context and synthesis (15 RPM / 1,500 RPD free)
3. gemini-2.5-flash-lite: Ultra-fast query expansion and brief extraction (15 RPM / 1,500 RPD free)
4. gemini-3.5-flash-lite: Fast conversational draft generation (15 RPM / 1,500 RPD free)
5. gemini-3.1-flash-lite: Lightweight failover (15 RPM / 1,500 RPD free)
6. Smart Core Deterministic Engine: 0ms offline fallback if daily quota hits midnight limit.

**Quota Protection Rules:**
- Clean sliding RPM windows every 60 seconds (cleanRpmWindow()).
- On HTTP 429 (RESOURCE_EXHAUSTED), mark model isExhausted: true until the daily midnight PST reset. Immediately cascade to the next available tier without failing the user's request.

## 3. High-Conversion Prompt Engineering Guidelines

### A. 1-Click Message Draft (draftMessageReply)
- Provide strict context: Contact Name, Deal Stage, Last Message, Intent (ollowup | kp_offer | meeting | eminder).
- Constraint: 3-4 sentences max, business-polite, closing call-to-action (CTA).
- Output: Raw message text only (no quotes, markdown backticks, or commentary).

### B. Objection Handling (nswerObjection)
- 3-step psychological framework:
  1. *Acknowledge & Validate:* ("Цілком розумію ваше занепокоєння...")
  2. *Evidence & Guarantee:* (Official D-visas, verified tests, 4x25% milestone escrow, 14-day free candidate replacement).
  3. *Low-Friction Next Step:* ("Пропоную затвердити ТЗ, і ми покажемо перші 3 анкети безкоштовно").

### C. Deal Health & Win Probability (scoreDeal)
- Output: Strict JSON schema (score: 0-100, 	emperature: emoji badge, eason: string, 
extAction: concrete action).
- Always wrap in JSON.parse with try/catch to guarantee valid UI object props.
