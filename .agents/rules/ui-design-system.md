# UI/UX Design System Guidelines: Bitrix24 Glassmorphism Edition

## Core Visual Identity
- **Aesthetic**: Modern Frosted Glassmorphism (Bitrix24 / macOS Enterprise).
- **Background**: Atmospheric blurred architectural/city wallpaper or subtle glass gradient, never flat monotonous pitch black.
- **Surface**: Translucent panels with `backdrop-blur-xl`, `bg-slate-900/60` (dark mode) or `bg-white/75` (light mode), bordered with `border border-white/10`.
- **Layout Architecture (3 Columns)**:
  1. **Left Navigation Sidebar**: Frosted glass with collapsible menu, badges on items (Deals, Tasks, Feed).
  2. **Top Global Bar**: Digital clock (HH:MM), live workday tracker (`🟢 ПРАЦЮЮ` / `⏸️ ПЕРЕРВА`), global Ctrl+K search bar.
  3. **Center Main Canvas**: Content feed / Kanban / CRM with quick action tabs.
  4. **Right Utility Sidebar**: Widget cards (Company Pulse, Pinned Announcements with "I have read" button, My Tasks counter by role, Upcoming Birthdays).
  5. **Far-Right Dock**: Slim strip with team avatars online and quick call action.

## Typography & Elements
- **Font**: Inter, clean sans-serif with crisp font weights (800 for headers, 600 for buttons, 400 for text).
- **Badges**: High-contrast notification pills (Red/Pink `#ff5752` for urgent/tasks, Emerald for WhatsApp, Sky for Telegram, Cyan for Bitrix actions).
- **Buttons**: Rounded-xl or 2xl with subtle glow (`shadow-lg shadow-blue-500/20`).
- **Interactive Feed**: Rich posts with attached files (.docx, .pdf), comment tree with avatars, and emoji reaction picker (`👍 ❤️ 😆 😮 😢 😡`).
