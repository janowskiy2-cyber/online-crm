---
name: crm-security-guardian
description: >-
  Use this skill whenever creating, reviewing, or modifying API routes, authentication logic,
  role-based access control (RBAC), database queries, and sensitive data handling in the CRM.
  Enforces enterprise-grade security standards, timing-safe comparisons, token-based verification,
  and prevents privilege escalation or unauthorized data leaks.
---

# CRM Security Guardian

This skill defines the mandatory security rules and verification workflows for the Enterprise CRM system.

## 1. Authentication & Route Protection (Zero-Trust)

- **JWT is Mandatory:** Every protected route MUST require a valid JWT Bearer token via `authRequired`.
- **Identity from Token Only:** Never trust `req.headers['x-user-id']` or query parameters to determine who is making the request. Always use `req.userId` and `req.userRole` decoded from the verified JWT.
- **Admin Endpoints:**
  - `adminRequired` middleware must first verify that `req.userId` exists.
  - If a user has an admin role (`super_admin`, `sales_director`, `admin`), access is granted.
  - Non-admin roles attempting admin actions MUST provide a valid master PIN in `x-admin-pin`.
  - **NEVER** allow an anonymous request without a JWT to gain admin access purely by supplying a header.

## 2. Timing Attacks & Password Security

- **Constant-Time PIN Verification:**
  - Always use `crypto.timingSafeEqual` with matched buffer lengths when validating PINs or secrets.
  ```typescript
  export function isMasterKeyValid(candidate: unknown): boolean {
    const masterKey = getMasterKey();
    if (!masterKey || typeof candidate !== 'string' || !candidate) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(masterKey);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
  ```
- **Password Storage:**
  - Use `scrypt` with a random 16-byte salt (`salt:hash`).
  - Never return password fields in database selects. Always use `userSafeSelect`.

## 3. Data Protection & Employee Directory Privacy

- `/api/auth/users` must be protected by `authRequired`. Do not expose the employee list, avatars, departments, or emails publicly to unauthenticated visitors.
- **Client Storage:**
  - Sensitive elevated credentials (like the admin PIN) must live only in `sessionStorage` (active tab lifetime), NEVER in persistent `localStorage`.
  - On receiving an HTTP 401 response, the client must trigger a clean logout (`clearAuth()`) to wipe stored tokens.

## 4. CORS & WebSockets Hardening

- Socket.IO must share the exact same `allowedOrigins` whitelist as Express HTTP CORS.
- Never use wildcard `origin: '*'` in production for authenticated endpoints or websockets.
