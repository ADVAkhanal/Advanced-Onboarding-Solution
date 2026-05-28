---
name: animated-component-libraries
description: Add tasteful, low-cost micro-interactions to Shop-Management React components — KPI cards, data tables, modals, drawers, toasts, toolbars. Use when an existing component needs subtle motion polish (hover/press states, value transitions, list reorder) without pulling in a heavy animation runtime or competing component library.
---

# Animated Component Libraries (Shop-Management)

Guidance for adding micro-interaction polish to existing React components. Prefer CSS transitions and existing primitives over new libraries.

## When to use this skill

- Polishing existing primitives in `src/components/` (`kpi-card`, `data-table`, `modal`, `toolbar`, `empty-state`, `module-workbench`).
- Adding hover, focus, press, or pending states to buttons, links, tabs, cards.
- Transitioning KPI counts/values when filters change on the dashboard.
- Highlighting newly arrived rows in tables (tickets, approvals, time-off requests).

## When NOT to use this skill

- Page-level transitions, route transitions → use `motion-framer`.
- Drag-and-drop, physics-based gestures → use `react-spring-physics`.
- Reveal-on-scroll for long pages → use `scroll-reveal-libraries`.
- Empty-state illustrations → use `lottie-animations`.
- Pure layout/spacing work → use `modern-web-design`.

## Project context

- React 18 + Next.js 14 App Router. RSC by default; client components opt in with `"use client"`.
- **Existing motion system already lives in `src/app/globals.css`** under the `Motion layer` comment block (~line 1099+). It defines `--motion-fast/base/slow`, easings, keyframes (`motion-fade-up`, `motion-fade-in`, `motion-slide-in-left`, `motion-pop`, `motion-shimmer`, `motion-pulse-soft`, `motion-progress-stripes`, `motion-spin`), entrance helpers (`.motion-fade-up`, `.motion-fade-in`, `.motion-slide-in`, `.motion-pop`), a stagger pattern (`.motion-stagger`), and transitions already applied to `.card`, `.button`, `.pill`, `.nav-item`. **Always reuse these before writing new keyframes.**
- Styling is hybrid: custom CSS classes from `globals.css` are primary; Tailwind utilities are available but secondary.
- Tailwind 3 also provides `transition`, `duration-*`, `ease-*`, `hover:`, `focus-visible:`, `aria-*` variants when you need a one-off.
- No JS animation library is installed. The bar for adding one is high — only via the `motion-framer` skill.

## Workflow

1. **Search `globals.css` first.** If you want a fade-up, the class is already named `.motion-fade-up`. If you want a staggered grid reveal, wrap the parent in `.motion-stagger`. Don't duplicate keyframes.
2. **Cards already lift on hover** if you add `.card-interactive` or use `<a class="card">`. Don't write new hover lifts on `.card`.
3. **Buttons already animate** press/hover/disabled — leave `.button` alone unless adding a new variant.
4. **For value transitions** (KPI count 12 → 18 on filter change): fade-out / fade-in via CSS opacity over 150ms. Avoid number-tweening libraries — bundle cost for marginal value in an internal tool.
5. **For row insertion in `data-table.tsx`**: add a one-shot `data-just-added` attribute and a small keyframe (or reuse `motion-pulse-soft` briefly) in `globals.css`.
6. **For modals/drawers**: rely on CSS `transform` + `opacity` transitions on the wrapper. If you need orchestration (multi-element stagger across mount/unmount, exit-before-unmount), graduate to `motion-framer`.
7. **Document non-obvious triggers** in a comment ("this row pulse fires once per session per ticket ID").

## Safe implementation rules

- Default to CSS, not JS, for state-driven motion.
- Reuse the `--motion-fast/base/slow` tokens defined in `globals.css` `:root` — don't hardcode durations.
- Animation duration ≤ 300ms for state changes; ≤ 500ms for entrances. ERP users will see this thousands of times — make it fast.
- `prefers-reduced-motion` is already globally honored at the bottom of `globals.css` (all animations/transitions clamped to 1ms). Do **not** add a second handler — extend the existing one if needed.
- Never animate layout-shifting properties (`width`, `height`, `top`, `left`) on hover — use `transform: scale/translate`.
- Never animate something the user is actively reading.
- Preserve keyboard focus visibility during any transition.

## Dependency rules

- Allowed: Tailwind utilities, CSS keyframes in `globals.css`, `lucide-react` icon transitions via Tailwind.
- Disallowed without explicit approval: `framer-motion`, `motion`, `react-spring`, `auto-animate`, `react-transition-group`, `gsap`, `anime.js`. (If you genuinely need orchestration, propose `framer-motion` and wait for approval — see `motion-framer` skill.)
- Disallowed: any UI component library (Radix, shadcn, MUI, Mantine) just to get animation. Build the animation in-house.

## Verification checklist

- [ ] Motion duration feels fast — verified in dev by clicking through 5+ times in a row without it feeling laggy.
- [ ] `prefers-reduced-motion: reduce` disables the motion (test in Chrome devtools → Rendering → Emulate CSS media feature).
- [ ] No layout shift introduced by the animation.
- [ ] Focus ring still visible during and after the transition.
- [ ] Bundle size unchanged (no new dependency).
- [ ] `npm run typecheck` passes.
