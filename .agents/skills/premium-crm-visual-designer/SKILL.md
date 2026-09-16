---
name: premium-crm-visual-designer
description: Luxury UI/UX visual craftsmanship skill inspired by Linear, Raycast, Vercel, and Apple Pro. Enforces luxury dark palettes (Midnight Obsidian), specular highlight borders, tactile micro-textures, radial mesh lighting, and fluid micro-interactions for high-ticket CRM interfaces.
---

# 💎 Premium CRM Visual Designer & Luxury Craftsmanship (SKILL.md)

Цей скіл відповідає за **елітну візуальну естетику**, преміальне сприйняття продукту та кінематику інтерфейсу. Він перетворює CRM зі звичайного інструменту обліку на дорогий, естетичний B2B-продукт преміум-класу рівня **Linear**, **Raycast**, **Vercel** та **Apple Pro**.

---

## 1. ПАЛІТРА "LUXURY DARK" (МІДНАЙТ ОБСИДІАН)

1. **Заборона плоского чорного (`#000000`) та мертвого сірого (`#808080`)**:
   - Чистий `#000` створює надмірний контраст і втомлює очі, а сірий виглядає дешево.
   - **Базові тони (Base Canvas)**:
     - Фон вікна: `bg-[#07090e]` або `bg-[#0a0f1d]` (глибокий синяво-графітовий відтінок).
     - Поверхня карток: `bg-[#0e1424]/90` або `bg-[#131b2e]/85`.
     - Підняті модальні вікна: `bg-[#0c111e]/95` з `backdrop-blur-2xl`.
2. **Градієнтне внутрішнє освітлення (Inner Ambient Glow)**:
   - Кожна картка та секція має м'який радіальний градієнт з боку активного статусу:
     ```css
     background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 70%), #0d1322;
     ```

---

## 2. СПЕКУЛЯРНІ ГРАНІ (SPECULAR BORDERS & HIGHLIGHTS)

Преміальний вигляд створюється імітацією світла, яке відбивається від відполірованого скла чи титанової фаски:
1. **Тонка 1px грань (Specular 1px Edge)**:
   - `border border-white/[0.08]` (не `border-gray-700`).
   - Наведення (`hover`): `hover:border-white/[0.18]` або перехід у відтінок активного етапу (`hover:border-blue-500/40`).
2. **Внутрішній блік зверху (Top Light Rim)**:
   - Внутрішня тінь додає об'єму матеріалу:
     ```css
     box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.5);
     ```
3. **Неонове гало статусів (Luminescent Status Halos)**:
   - Замість плоских кружечків використовуються пульсуючі гало:
     - 🟢 Заплановано: `shadow-[0_0_8px_rgba(52,211,153,0.8)] bg-emerald-400`
     - 🟡 Без задачі: `shadow-[0_0_8px_rgba(251,191,36,0.8)] bg-amber-400`
     - 🔴 Прострочено: `shadow-[0_0_10px_rgba(244,63,94,0.9)] bg-rose-500 animate-pulse`

---

## 3. ТАКТИЛЬНІ МІКРОТЕКСТУРИ ТА ГРАДІЄНТНИЙ ШУМ (NOISE & TEXTURE)

Великі темні поверхні без текстури виглядають порожніми:
1. **Архітектурні текстури бізнес-класу**:
   - Використання напівпрозорого оверлею з фото міської сучасної архітектури з низькою непрозорістю (`mix-blend-overlay opacity-10-15`).
2. **Мікро-сітка (Subtle Gridlines)**:
   - Для дашбордів та фонів: ледь помітна 24px сітка на задньому плані:
     ```html
     <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
     ```

---

## 4. КІНЕМАТИКА ТА МІКРОІНТЕРАКЦІЇ (KINETIC MICRO-INTERACTIONS)

1. **Фізика переходів (Apple Pro Spring Timing)**:
   - Замість стандартного `transition-all duration-150` використовується шовковистий cubic-bezier:
     ```css
     transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
     ```
2. **Тактильний підйом карток при наведенні**:
   - `hover:-translate-y-1 hover:shadow-[0_20px_35px_-10px_rgba(0,0,0,0.6)] hover:border-white/20 active:scale-[0.99]`
3. **Мікро-анімація іконок**:
   - Плавне обертання стрілочки `ChevronDown` на 180 градусів при розкритті міні-картки (`transition-transform duration-300`).
   - М'яке згасання бейджів (`animate-in fade-in zoom-in-95`).

---

## 5. ТИПОГРАФІКА ТА ЦИФРИ (DATA LUXURY TYPOGRAPHY)

1. **Суворий контраст**:
   - Заголовки компаній/клієнтів: `text-white font-extrabold tracking-tight`.
   - Вторинні дані: `text-slate-300 font-medium`.
   - Допоміжний текст: `text-slate-400 text-xs`.
2. **Фінансові показники та дати**:
   - Бюджети, суми, таймери та лічильники завдань оформлюються шрифтом `font-mono`:
     - Зелений неон для грошей: `text-emerald-400 font-mono font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg`.
     - Часовий таймер: `font-mono text-[11px] font-bold tracking-tight`.

---

## 6. ЗОЛОТИЙ РЕЦЕПТ LUXURY КАРТКИ (TAILWIND RECIPE)

```tsx
<div className="relative group overflow-hidden rounded-2xl bg-[#0c1220]/90 backdrop-blur-xl border border-white/[0.08] hover:border-blue-500/40 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_30px_-5px_rgba(37,99,235,0.2)] hover:-translate-y-1 transition-all duration-200">
  {/* Specular light highlight on top */}
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  
  {/* Ambient Stage Glow */}
  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
  
  {/* Card Body */}
  <div className="relative p-3.5 space-y-2.5">
    {/* Content */}
  </div>
</div>
```

---

## 7. ЧЕКЛІСТ ПРЕМІАЛЬНОГО ВІЗУАЛУ ПЕРЕД РЕЛІЗОМ

- [ ] Чи виглядає інтерфейс глибоким, багатошаровим та естетичним (ніяких пласких сірих коробок)?
- [ ] Чи є на картках спекулярний 1px контур та верхній блік відбиття світла?
- [ ] Чи приємні та плавні мікроінтеракції при наведенні та кліку?
- [ ] Чи коректно підсвічуються статуси та таймлайни світлодіодним неоновим сяйвом?
- [ ] Чи підтверджено повну функціональність роботом Playwright (`node test-crm-robot.js`)?
