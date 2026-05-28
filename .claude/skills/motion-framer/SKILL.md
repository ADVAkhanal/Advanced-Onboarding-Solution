---
name: motion-framer
description: Use Framer Motion (Motion) for orchestrated, React-idiomatic animations in Shop-Management — modal open/close, drawer slides, route transitions, list enter/exit, KPI counter tweens. Use when CSS transitions cannot express the orchestration (exit-before-unmount, AnimatePresence, layout animations, gestures across siblings).
---

# Motion / Framer Motion (Shop-Management)

The escalation path beyond CSS transitions when you genuinely need orchestration in React.

## When to use this skill

- Modal/drawer enter/exit with `AnimatePresence` (current `modal.tsx` likely needs this when you want exit animations).
- Layout animations on `data-table.tsx` row reorder (`layoutId`, `layout` prop).
- Page transitions inside `src/app/(platform)/layout.tsx` between routes.
- KPI value tweens on `kpi-card.tsx` when filters change.
- Stagger reveals on dashboard sections, larger than what `scroll-reveal-libraries` covers.
- Gesture-driven modals (swipe-to-dismiss on touch).

## When NOT to use this skill

- Simple hover/focus/press states — use Tailwind transitions (see `animated-component-libraries`).
- Long-page reveal-on-scroll — use `scroll-reveal-libraries`.
- Physics-heavy drag-and-drop, spring-driven gestures — use `react-spring-physics`.
- Pure decoration without functional payoff — skip.
- Performance-critical surfaces (long tables, infinite lists) — motion-framer can be costly per node.

## Project context

- React 18 + Next.js 14 App Router. Client components only — Motion does not render on the server.
- **The codebase already has a CSS motion system in `src/app/globals.css`** (keyframes, easings, entrance helpers, stagger, `.card`/`.button`/`.pill` transitions, quiz/SOP animations, global `prefers-reduced-motion` handler). That system covers ~80% of needs. Motion-framer is the **escalation** for the remaining 20%: anything CSS keyframes genuinely cannot express.
- No JS animation library currently installed. Installing `motion` is a real bundle cost (~30–50KB gzipped).
- `cleanops` color palette and tokens already cover styling; Motion only handles animation.

## Workflow

1. **First: confirm CSS cannot do it.** Read the `Motion layer` block in `src/app/globals.css`. If a `.motion-*` class fits, use it. If a small CSS keyframe + transition would suffice, add it there. Only if you genuinely need exit-before-unmount, layout animations, or coordinated cross-component orchestration do you escalate.
2. **Justify the install.** Before proposing `npm install motion`, document the 1–3 specific surfaces that need orchestration (e.g., "modal exit animation + dashboard KPI count tween + ticket row layout animation"). Three real use cases = install. One use case = use CSS.
2. **Prefer the modern `motion` package** over the legacy `framer-motion` import path — same library, lighter API surface.
3. **Wrap only what needs animation.** Do not lift entire pages into `<motion.div>` unnecessarily — each motion node has overhead.
4. **For modals/drawers:**
   ```tsx
   <AnimatePresence>
     {open && (
       <motion.div
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0, y: 8 }}
         transition={{ duration: 0.18, ease: "easeOut" }}
       />
     )}
   </AnimatePresence>
   ```
5. **For KPI counts:** use `useMotionValue` + `animate` to tween the number; render via `useTransform` rounding to integer.
6. **For row reorder:** apply `layout` to each `<motion.tr>` and a stable `key` per row. Disable when row count > 50 (cost).
7. **Always pair with `MotionConfig reducedMotion="user"`** at the app shell — Motion will then honor the OS-level preference automatically.

## Safe implementation rules

- All `motion` components must be inside `"use client"` files.
- Keep durations short: 150–250ms for UI state, 300–400ms for entrances. Easings: `easeOut` for entrances, `easeIn` for exits.
- Never animate `width`/`height`/`top`/`left` — use `transform` (Motion does this by default with `x`, `y`, `scale`).
- Wrap the root app shell with `<MotionConfig reducedMotion="user">` to globally honor `prefers-reduced-motion`.
- Do not animate inside list rows of long tables — set a row-count threshold.
- Never use Motion for state changes that affect correctness (e.g., showing an error message). The error must be in the DOM immediately for screen readers; Motion can ease its opacity, but the element must exist.

## Dependency rules

- Propose, don't install: `motion` (the modern package, replaces `framer-motion`). Wait for user approval before running `npm install motion`.
- Disallowed without approval: `react-spring` (use `react-spring-physics` skill instead if physics needed), `react-transition-group`, `gsap`.
- After approval: pin to a specific minor version in `package.json` (no `^` range gaps that span majors).

## Verification checklist

- [ ] `npm install motion` was explicitly approved by the user.
- [ ] `<MotionConfig reducedMotion="user">` wraps the root app shell.
- [ ] No `motion.*` element renders inside an RSC file (would error at build).
- [ ] Modal exit animations actually complete before unmount (verified via slow-motion playback in devtools).
- [ ] No layout-property animations (`width`/`height`/`top`/`left`).
- [ ] Bundle size delta after install is < 60KB gzipped — verified via `next build` output.
- [ ] Long tables (> 50 rows) do not apply `layout` per row.
- [ ] Lint, typecheck, and `npm test` pass.
