---
name: mobile-app-ui-design
description: Design high-quality mobile app UI/UX screens, flows, and components. Use this skill whenever the user asks to design a mobile app screen, create app mockups, build mobile UI components, improve an existing mobile app design, create onboarding flows, design mobile navigation, or requests any mobile-first interface work. Also trigger when the user mentions app design, mobile UI, mobile UX, screen design, app mockups, wireframes, or wants to build React Native / Flutter / SwiftUI style interfaces as visual prototypes.
---

# Mobile App UI/UX Design Skill

This skill guides the creation of professional, polished mobile app interfaces that follow proven design principles used by top-tier apps like Airbnb, Duolingo, Spotify, Revolut, and Phantom.

## Core Philosophy

Great mobile UI isn't about flashiness — it's about intentionality. Every pixel, every spacing value, every color choice should serve the user. The goal is to create interfaces that feel smooth, personal, and alive — not just functional.

Before designing anything, understand three things:
1. **What is the user trying to accomplish?** (reduce friction to that goal)
2. **How should this make the user feel?** (trust, delight, confidence, calm)
3. **What's the one thing they should notice first?** (visual hierarchy)

## Design Process

Follow this sequence for any mobile screen:

### Step 1: Understand the Context
- What type of app? (sales, CRM, recruitment, messaging, telephony)
- Who is the user? (manager in a taxi, recruiter on the go, executive reviewing revenue)
- What's the primary action on this screen? (call client, reply in WhatsApp/Telegram, advance deal stage)

### Step 2: Structure First (UX Lens)
- **Thumb Zone Rule:** Place 80% of primary actions in the bottom 40% of the phone screen (easy one-handed reach).
- **Minimum Touch Targets:** All interactive elements must be minimum 44×44px (recommended 48×48px) to prevent mis-taps.
- **Haptic & Visual Feedback:** Every touch must have immediate visual acknowledgement (`active:scale-95`, ripple, highlight).
- **Reduced Friction:** Direct 1-tap actions over nested sub-menus.

### Step 3: Apply Visual Design (UI Lens)
- **Typography:** Max 4 font sizes, high contrast (`text-white`, `text-slate-200`, `text-slate-400`).
- **Color System (60/30/10):** 60% dark frosted glass base, 30% panel structure, 10% vivid status accents (emerald won, rose lost, cyan in progress, amber warning).
- **Spacing (8-Point Grid):** Spacing in multiples of 4/8px (`p-2`, `p-3`, `p-4`, `p-6`).
- **Safe Areas:** Support iOS Dynamic Island / home bar (`pb-safe`, `pt-safe`, `env(safe-area-inset-bottom)`).
