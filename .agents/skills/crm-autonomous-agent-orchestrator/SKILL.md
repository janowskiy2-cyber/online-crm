---
name: crm-autonomous-agent-orchestrator
description: Use this skill for designing and implementing autonomous background AI agents, digital pipeline triggers, auto-qualification rules, round-robin lead routing, proactive deal alerts, and resilient event-driven CRM workflows.
---

# 🤖 CRM Autonomous Agent Orchestrator & Digital Pipeline Skill

This skill governs the architecture, development, and execution of autonomous background agents within the CRM ecosystem. Inspired by industry-leading systems (**Salesforce Einstein Bots/Automations**, **amoCRM Digital Pipeline**, and **Bitrix24 Robotic Process Automation (RPA)**), it enforces deterministic execution, zero-deadlock workflows, resilient queuing, and fair multi-agent routing.

---

## 1. Core Architecture of CRM Autonomous Agents

Autonomous agents in this CRM operate on an **Event-Condition-Action (ECA)** loop wrapped with self-healing circuit breakers:

```
[ CRM Event: Lead Inbound / Webhook / Deal Stage Change / Timer ]
                             │
                             ▼
              [ Deduplication & Idempotency Key ]
                             │
                             ▼
         [ Fast Rule Engine (Deterministic Filter) ]
          ├── Match? ──> Yes ──> [ Instant Action / Route ]
          └── Need AI? ──> Yes ──> [ Flash-Lite Model Cascade ]
                                          │
                                          ▼
                         [ Action Executor (Prisma Tx) ]
                         ├── Reassign Manager (Round-Robin)
                         ├── Move Kanban Stage (Qualified)
                         ├── Create Smart Follow-up Task
                         └── Push Notification (Web Push/WS)
```

---

## 2. Mandatory Principles & Safety Guardrails

### 2.1. Strict Idempotency & Replay Protection
- Every background webhook, scheduled job, or autonomous event **MUST** generate an `idempotencyKey` (e.g. `hash(dealId + eventType + timestampWindow)`).
- Prevent duplicate actions (e.g., sending the same message twice or spawning duplicate tasks) if network retries occur.

### 2.2. Circuit Breakers & Quota Protectors
- Maximum concurrent background AI requests: **5**.
- If external API returns `429 Too Many Requests` or network timeouts, the orchestrator triggers **exponential backoff** with jitter (1s, 2s, 4s, 8s up to 60s).
- Fallback to rule-based heuristics immediately if AI fails, ensuring the CRM pipeline **never freezes**.

### 2.3. Fair Round-Robin Lead Distribution
When new inbound leads arrive via WhatsApp or Telegram:
1. Identify all active managers with status `online` and clock-in capsule active (`workShift: "active"`).
2. Query managers with the fewest active deals in the `NEW_LEAD` or `IN_PROGRESS` stages.
3. Atomically assign `responsibleId` in a Prisma transaction to prevent race conditions:
   ```typescript
   await prisma.$transaction(async (tx) => {
     const nextUser = await findNextAvailableManager(tx);
     await tx.deal.update({
       where: { id: dealId },
       data: { responsibleId: nextUser.id }
     });
   });
   ```

---

## 3. Digital Pipeline Triggers & Autopilot Actions

### 3.1. Auto-Qualification Agent
- **Trigger**: New contact message received in stage `NEW_LEAD`.
- **Condition**: Deal has no budget or missing target requirements.
- **Action**: Analyze incoming messages for intent:
  - *High Budget / Ready to buy*: Auto-tag `#hot-lead`, set priority to `URGENT`, trigger immediate Web Push to manager.
  - *Job Seeker / Candidate*: Auto-categorize to Recruitment pipeline, extract skills, and match against open vacancies.
  - *Spam / Bot*: Auto-mark for review with low priority, without polluting manager notification feeds.

### 3.2. Stale Deal & Dormant Pipeline Sentry
- Periodic cron / background runner checks for deals idle for `> 48 hours` in active stages (`PROPOSAL`, `NEGOTIATION`).
- Automatically creates a priority task: `"Зателефонувати клієнту: відсутній контакт понад 48 годин"`.
- Emits real-time WebSocket warning to the responsible manager's Quick Dock.

### 3.3. Zero-Data-Loss Invariant
- Autonomous agents are **STRICTLY FORBIDDEN** from executing hard deletes (`delete` or `deleteMany`).
- If an agent determines an entity should be closed or discarded, it sets `isArchived: true` or transitions to `LOST` with a logged reason.

---

## 4. Verification & Audit Trail Checklist

Before committing or deploying any background agent logic:
1. **Audit Logs**: Ensure every agent action logs a clear history record in `DealHistory` or `AuditLog` (`actor: "AI_AGENT"`, `action: string`, `timestamp`).
2. **Typecheck & Build**:
   ```bash
   cd server && npm run typecheck
   cd client && npm run build
   ```
3. **End-to-End Simulation**: Run `node test-crm-robot.js` to ensure Kanban and messaging endpoints remain 100% functional.