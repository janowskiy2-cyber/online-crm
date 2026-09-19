---
name: responsive-craft
description: "Implement responsive design for websites and web apps — from standard mobile-first layouts to complex patterns (sticky elements, scroll coordination, data tables, dashboards). Three modes: transform existing sites, build responsive from scratch, or launch a live multi-breakpoint preview. Surfaces design forks where there's no single right answer. Use when building responsive layouts, fixing mobile issues, adding breakpoints, working with sticky/scroll patterns, previewing breakpoints, or when the user mentions responsive, mobile, breakpoints, viewport, adaptive design, or responsive preview."
argument-hint: "[audit|build|preview]"
---

# Responsive Craft

Implement responsive design that works across all viewports — compensating for the lack of a visual canvas by making deliberate decisions upfront.

## Quick Start

**Transform an existing site:** `/responsive-craft audit` or "make this responsive" or "fix the mobile layout"
**Build responsive from scratch:** `/responsive-craft build` or "build this mobile-first" or "create a responsive layout"
**Preview all breakpoints:** `/responsive-craft preview` or "show me the responsive preview" or "open the breakpoint preview"

---

## Core Principles

1. **Escalation model** — Intrinsic CSS first (`auto-fit`, `flex-wrap`, `clamp()`) → container queries next (component-level) → media queries last (page-level only). If a simpler layer solves it, stop there.

2. **Describe before you code** — Without a canvas, explicitly describe responsive behavior before writing CSS. In Adaptive mode, use inline behavior notes (CSS comments). In Guided mode, write formal behavior specs (tables per component). Both catch design decisions a canvas would reveal passively.

3. **Fluid by default, breakpoints by exception** — Use `clamp()` for typography, spacing, sizing. Reserve hard breakpoints for structural changes: nav transforms, column count shifts, sidebar visibility.

4. **Component containment** — Components respond to their container, not the viewport. Use container queries. A card in a sidebar and a card in a full-width section should use the same CSS.

5. **Test by dragging, not jumping** — Slowly resize from 280px to 2560px in DevTools. Don't just check named breakpoints. This catches in-between failures.

6. **Sticky/scroll needs explicit patterns** — Sticky coordination, z-index stacking contexts, overflow ancestors, safe areas, virtual keyboards. These break silently. Use the patterns in `references/sticky-scroll-patterns.md`, don't improvise.

7. **Recognize design forks, don't default silently** — When a responsive translation has multiple valid approaches, present 2-3 options with tradeoffs and ask the user to choose. See `references/responsive-design-forks.md`.

---

## The Three-Layer Responsive System

| Layer | Tool | Handles |
|-------|------|---------|
| Continuous | `clamp()`, fluid tokens, `cqi` units | Smooth scaling — font size, padding, gap |
| Component | Container queries (`@container`) | Adapting to context — card layout, nav items |
| Structural | Media queries (`@media`) | Page-level shifts — grid columns, nav transform, sidebar |

### Escalation Decision Tree

```
Does this need to change layout?
  No  → clamp() for sizing. Done.
  Yes → Does it depend on CONTAINER size?
    Yes → Container query
    No  → Does it depend on VIEWPORT?
      Yes → Media query (page-level only)
      No  → :has() or intrinsic sizing (auto-fit, flex-wrap)
```
