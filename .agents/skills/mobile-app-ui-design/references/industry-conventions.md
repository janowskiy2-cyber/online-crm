# Mobile Industry Conventions for CRM & Business Apps

## 1. Ergonomic Thumb Zone
- Bottom 35% of the screen is the Natural Thumb Zone.
- Place primary actions (Call, Message, New Lead, Stage Move) here.
- Place destructive or secondary actions in upper corners (requires deliberate reaching).

## 2. Dynamic Viewport (dvb / dvh)
- Use `100dvh` for modals and full-height screens so the iOS Safari address bar or Android Chrome toolbar doesn't clip content or create rubber-band jumps.

## 3. Touch Feedback
- Buttons should feel responsive and physical: `active:scale-[0.97] transition-transform duration-100 ease-out`.
- Provide clear loading spinners on tap so users know their action registered.

## 4. Single-Handed CRM Workflows
- Moving a deal from stage to stage on phone shouldn't require complex dragging: provide a simple 1-tap "Переместить этап" modal sheet with big friendly stage pills.
- 1-tap dialer: tapping phone immediately initiates call or opens WhatsApp chat.
