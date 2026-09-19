# Responsive Design Forks

Patterns where there is no single correct responsive translation. When the skill identifies one of these, it should present the options with tradeoffs and ask the user to choose — not default silently.

---

## Fork 1: Sidebar Navigation on Mobile

**Desktop pattern:** Fixed left sidebar (260px) with logo, navigation links, quick action buttons, and status icons.

### Option A: Floating Bottom Dock (Preferred for CRM)
- 4-5 core primary icons pinned at bottom center with frosted glass (`backdrop-blur-xl`).
- High ergonomic reachability (Thumb Zone).
- Hamburger or "More" button reveals secondary views in a bottom sheet drawer.

### Option B: Off-Canvas Hamburger Drawer
- Slides in from the left over the content.
- Clean full-screen view, but requires an extra tap to switch pages.

---

## Fork 2: Kanban Pipeline on Mobile

**Desktop pattern:** 5-7 columns side-by-side with drag and drop.

### Option A: Horizontal Snap Carousel (Best Mobile UX)
- Horizontal swipe with CSS `scroll-snap-type: x mandatory` and `scroll-snap-align: center`.
- Top sticky stage tab switcher pill bar: tapping a stage smoothly scrolls directly to that column.
- Each column is `w-[88vw]` or `w-[92vw]` with visible peek of neighboring stages.

### Option B: Single Active Stage with Segmented Control
- Only one stage visible at a time.
- Switch stages with top pills or swipe gesture.

---

## Fork 3: Multi-Column Modal (e.g., Deal Detail Modal)

**Desktop pattern:** 3 columns side-by-side (Left: Dossier/Contact, Center: Chat/Timeline, Right: Stages/Tasks).

### Option A: Tabbed Fullscreen Mobile Sheet (Linear / amoCRM style)
- Takes full height `100dvh` with rounded top on tablets, flat on phones.
- Top tab switcher: `Инфо` | `Чат` | `Задачи`.
- Fixed bottom messenger input bar when in `Чат` tab.
- Floating quick actions (Call, WhatsApp, Move stage).
