---
name: crm-messenger-reliability
description: >-
  Use this skill when working on WhatsApp (Baileys), Telegram (GramJS/MTProto), WebSockets,
  or multi-channel messaging integrations in the CRM. Enforces 24/7 session persistence,
  graceful shutdown procedures, database backup, and anti-ban safeguards.
---

# CRM Messenger Reliability & 24/7 Persistence

This skill governs the integration of real-time messaging channels in the CRM.

## 1. Iron Rules for Messaging Channels

1. **Telegram — Strictly Personal/Corporate Account (NEVER a Bot!):**
   - B2B clients and executives must communicate with a real human account (GramJS / MTProto StringSession) displaying a phone number, avatar, and online status.
   - Do not substitute bots or bot tokens for corporate 1-on-1 customer dialogues.
2. **WhatsApp Baileys Database Session Persistence:**
   - Always persist credentials and keys into PostgreSQL (`MessengerSession` table).
   - Ephemeral hosting environments (e.g., Render, serverless containers) wipe local disk on restart. Storing session state in PostgreSQL ensures the QR-code login survives all redeployments.
3. **Graceful Shutdown Protocol:**
   - Every Node process termination (`SIGTERM`, `SIGINT`) must trigger:
     ```typescript
     await waService.backupSessionToDatabase();
     ```
   - Before the process exits, save current auth credentials to prevent session invalidation.

## 2. Anti-Ban & Rate-Limiting Best Practices

- Add human-like typing delays (800ms - 2500ms) before automated dispatch.
- Never blast identical marketing templates in bulk.
- Handle socket disconnects with exponential backoff rather than immediate aggressive re-dialing.
