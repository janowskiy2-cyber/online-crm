---
name: mobile-crm-ux
description: Master Mobile CRM Engineering & UX Skill. Enforces mobile-first responsive architecture, thumb-zone ergonomics, bottom sheets, mobile kanban snapping, fullscreen deal modals with segmented tabs, 1-tap dialer/chat triggers, virtual keyboard resilience, and iOS/Android safe area adaptations for sales and recruitment CRM. Use whenever optimizing or developing CRM features for smartphones and tablets.
---

# Mobile CRM UX & Engineering Standard (mobile-crm-ux)

This skill governs the end-to-end mobile user experience for our enterprise CRM system, ensuring that recruiters and sales managers can comfortably close deals, chat with candidates, listen to calls, and track pipelines directly from their smartphones using one hand.

---

## 1. Ergonomic Foundation (Thumb-Zone & Touch Targets)

1. **Natural Thumb Zone:**
   - 80% of interactive work happens in the bottom 40% of the screen.
   - Fixed Bottom Navigation / Action Dock (`fixed bottom-0 left-0 right-0 z-40`).
   - Sticky message composer and 1-tap call triggers positioned at the bottom.
2. **Touch Target Standard:**
   - Every tappable button or icon must have a touch target of at least **44×44px** (ideally **48×48px**).
   - Use negative margin / padding tricks (`p-3 -m-1`) or `min-w-[44px] min-h-[44px]` to ensure even small icons are effortlessly tappable.
3. **Physical Tactile Feedback (Apple Fluid Interfaces):**
   - Active press state on all cards and buttons: `active:scale-[0.97] transition-all duration-150`.
   - Smooth sheet dismissal with drag handles and instant backdrop touch dismissal.

---

## 2. Viewport & Screen Safety

1. **Dynamic Viewport (`100dvh`):**
   - Always use `min-h-[100dvh]` and `h-[100dvh]` instead of `100vh` to eliminate mobile browser URL bar jumps (Safari / Chrome).
2. **Safe Area Insets:**
   - Bottom bars and sheets must declare:
     ```css
     padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
     ```
   - Top navigation bars must declare:
     ```css
     padding-top: max(0.5rem, env(safe-area-inset-top));
     ```
3. **Virtual Keyboard Handling:**
   - Chat inputs and deal edit forms must maintain visibility when the onscreen keyboard pops up.
   - Prevent page zoom on input focus: inputs must use `text-base sm:text-sm` (font size >= 16px on mobile prevents auto-zoom in iOS Safari).
   - Prevent background bounce: `overscroll-behavior-y: contain`.

---

## 3. Core Mobile CRM Views

### A. Mobile Kanban Pipeline
- **Horizontal Snapping:** Pipeline columns snap smoothly with CSS:
  ```css
  overflow-x-auto snap-x snap-mandatory scrollbar-none
  ```
- **Sticky Column Quick-Jump Bar:** Top horizontal pill list allows tapping any stage (e.g. "Новый", "В работе", "Собеседование") to smoothly scroll directly to that column.
- **Card-Level Stage Mover:** On mobile, dragging cards across horizontal columns is clumsy; each card provides a 1-tap stage selector or swipe action.
- **1-Tap Quick Actions:** Direct Call (phone icon) and WhatsApp/Telegram icons directly on the kanban card.

### B. Mobile Deal Detail Modal
- **Fullscreen Sheet:** On screens `< 768px`, the deal modal occupies the entire viewport (`w-full h-[100dvh] rounded-none`).
- **Segmented 3-Tab Control:**
  - 📋 **Инфо:** Contact info, responsible manager, candidate vacancy, documents, custom fields.
  - 💬 **Чат:** WhatsApp/Telegram timeline + bottom sticky composer with voice note & attachment buttons.
  - ⚡ **Задачи & История:** Quick task creator, stage switcher, financial milestones (4×25%), system logs.
- **Fixed Floating Action Bar:** 1-tap "Позвонить", "Написать", "Сменить этап" always reachable at the bottom.

### C. Mobile Unified Inbox
- Split list-detail flow: when conversation is selected on phone, conversation fills 100% of the screen with a top back button (`← Назад к чатам`).
- Voice note recording with lock-to-record swipe.
- Image/Document quick capture via camera or file picker.

### D. Mobile Telephony & Call Player
- Incoming/Outgoing call banner with full-width action buttons.
- Call audio player with large thumb-friendly scrubber, 10-second skip buttons, and 1x/1.5x/2x playback speed chips.
