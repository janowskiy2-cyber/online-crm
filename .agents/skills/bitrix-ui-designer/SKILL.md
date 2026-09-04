---
name: bitrix-ui-designer
description: Comprehensive skill for designing and building Bitrix24-style enterprise UI interfaces with glassmorphism, company pulse widgets, live workday trackers, and interactive corporate feeds.
---

# Bitrix UI Designer Skill

When building or styling pages in this CRM:
1. **Always use Glassmorphism**:
   - `backdrop-blur-xl bg-slate-900/60 border border-white/10 text-white`
   - Soft glowing shadows and vibrant badge indicators.
2. **Top Header Standard**:
   - Digital Clock (live `HH:MM`).
   - Workday Tracker Widget: Status badge (`🟢 ПРАЦЮЮ` / `🔴 ЗАВЕРШИТИ ДЕНЬ`), tracks shift duration.
   - Omnisearch input with keyboard shortcut hint.
3. **Right Utility Sidebar**:
   - "Пульс компанії": Percentage progress bar with activity indicator.
   - "Важливі повідомлення": Highlighted card with author, date, carousel navigation, and confirmation button "Я прочитав(ла)".
   - "Мої завдання": Tasks segmented into roles: *Виконую*, *Допомагаю*, *Доручив*, *Спостерігаю*.
   - "Дні народження": List of upcoming employee/candidate birthdays.
4. **Live Feed ("Жива стрічка")**:
   - Publisher bar with tabs: [Повідомлення | Завдання | Подія | Опитування | Файл].
   - Post cards with avatar, author, recipient ("Всім співробітникам"), attached files (.docx / .pdf), comment thread, and interactive emoji reaction popup.
