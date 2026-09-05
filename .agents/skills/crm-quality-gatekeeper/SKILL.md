---
name: crm-quality-gatekeeper
description: >-
  Use this skill to evaluate, filter, and validate code updates before committing or deploying.
  Distinguishes correct enterprise updates from dangerous regressions. Enforces zero data loss,
  build verification, AI model compatibility checks against official lifecycles, and automated test passage.
---

# CRM Quality Gatekeeper (Change Vetting & Standards)

This skill provides the decision framework for accepting or rejecting code modifications in the CRM.

## 1. The Change Filter: Correct vs. Prohibited Updates

### ✅ ACCEPTABLE (CORRECT) UPDATES:
1. **Backward-Compatible Refactoring:** Code structure improves without altering external contracts or database integrity.
2. **Strict Verification:** Passing `npm run typecheck` on server and `npm run build` on client with zero errors.
3. **Zero Data Loss (Soft Deletion):** Deletions use `isArchived: true` with a 30-day recovery retention window.
4. **Verified AI Models:** Before adding or removing AI models, verify against Google’s official Gemini lifecycle documentation for the current year. (e.g., in 2026, Gemini 1.5 is shut down; Gemini 2.5 and 3.x series are active).
5. **Modal Accessibility:** Every modal dialog must support `Escape` key close, backdrop dismissal, and `data-testid="close-modal"`.

### ❌ PROHIBITED (REJECTED) UPDATES:
1. **Silent Deletions:** Using `prisma.deleteMany()` or dropping production tables/columns without migration files.
2. **Blindly Removing AI Models:** Truncating model cascades without verifying whether the target models exist and are active.
3. **Hardcoding Secrets:** Committing plaintext passwords, master PINs, or raw API keys into source code.
4. **Invasive Overlays:** Transparent full-screen `fixed inset-0` click-interceptors that block user pointer events.
5. **Breaking Test Suites:** Committing code when `node test-crm-robot.js` fails any of the 45 test stages.

## 2. Mandatory Verification Checklist (Run Before Every Commit)

```bash
# 1. Server typecheck & build
cd server && npm run typecheck && npm run build

# 2. Client build verification
cd client && npm run build

# 3. End-to-end CRM robot test (must be 45/45 PASS)
cd .. && node test-crm-robot.js
```

## 3. Code Cleanliness & Maintenance Rules

- **Dependencies:** If a package is directly imported (e.g., `big-integer` in telegram service), it MUST be declared in `package.json`, never left to accidental transitive resolution.
- **Git Hygiene:** Never commit screenshot artifacts, temporary logs, or `.env` files. Clean index with `git rm -r --cached` if accidental tracking occurs.
- **Deployment Build:** Always compile TypeScript to `dist/` on production (e.g. Render `startCommand: cd server && npm run start`), never run `tsx` in production runtime.
