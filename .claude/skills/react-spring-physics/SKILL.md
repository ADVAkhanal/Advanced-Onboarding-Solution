---
name: react-spring-physics
description: Use react-spring for physics-driven interactions in Shop-Management — drag-to-reorder ticket lists, kanban-style approval boards, swipe-to-dismiss drawers, gesture-driven sliders. Use only when a spring/inertia feel is the actual product requirement, not for ambient polish.
---

# React Spring Physics (Shop-Management)

Reach for `react-spring` only when interaction *feel* matters — drag, throw, momentum, settle. For everything else, use `motion-framer` or CSS.

## When to use this skill

- Drag-to-reorder on ticket lists, approval queues, payroll line items.
- Kanban-style board if/when a board view is added (tickets, training assignments).
- Swipe-to-dismiss drawers or modals on touch devices.
- Gesture-driven range/threshold sliders in reports (date range pickers).
- Pinch/zoom on inspection report images (if FAIR images ever land in the UI).

## When NOT to use this skill

- Modal enter/exit, page transitions — use `motion-framer`.
- Static reveal-on-scroll — use `scroll-reveal-libraries`.
- Hover/focus micro-interactions — use Tailwind.
- Anywhere keyboard users can't replicate the gesture — drag-only is an accessibility failure.

## Project context

- React 18 + Next.js 14 App Router. Client components only.
- No animation or gesture library currently installed.
- ERP users are mostly keyboard + mouse on desktops. Touch is secondary. Physics gestures must have keyboard equivalents.
- For non-physics needs (entrance reveals, hover lifts, button presses), the CSS motion layer in `src/app/globals.css` already covers it — do not pull `react-spring` for those.

## Workflow

1. **Justify the install.** Before proposing `npm install @react-spring/web @use-gesture/react`, identify a specific gesture that genuinely benefits from spring physics (not just "feels smoother"). A drag-to-reorder list with > 5 items is a yes; a hover state is a no.
2. **Pair `@react-spring/web` with `@use-gesture/react`** — that's the standard stack. Don't try to roll your own pointer handling.
3. **Always provide a keyboard/click fallback.** A drag-to-reorder list must also support arrow-key reordering (Up/Down with focus on a handle) and a visible move button. Test the keyboard path first — if it works there, layer the gesture on top.
4. **Spring config:** start with `config.gentle` or `{ tension: 300, friction: 30 }`. Avoid bouncy presets (`config.wobbly`) — they feel toy-like in an ERP.
5. **Persist reorder server-side.** When a drag completes, fire the server action / API call. Optimistically update local state with the new order; reconcile on response.
6. **Mark the component `"use client"`.** Wrap in `next/dynamic` with `ssr: false` if it pulls in significant gesture code.

## Safe implementation rules

- Every drag interaction must have a non-drag equivalent (button + arrow keys).
- Respect `prefers-reduced-motion`: snap to the target value instead of spring-tweening.
- Use `touch-action: none` only on the drag handle, not the whole row — otherwise vertical scroll on touch devices is broken.
- Persist the new order to the server immediately on drop. Do not let a user reorder and lose the change on refresh.
- Don't apply spring physics to text content — only to containers, handles, or visual indicators.

## Dependency rules

- Propose, don't install: `@react-spring/web` and `@use-gesture/react`. Wait for user approval. Bundle cost is ~25–40KB gzipped combined.
- Disallowed without approval: `framer-motion` drag (use `motion-framer` skill if you'd rather), `react-dnd` (heavy, complex API), `react-beautiful-dnd` (unmaintained).
- For sortable lists specifically, also consider proposing `@dnd-kit/core` + `@dnd-kit/sortable` — it has better keyboard a11y out of the box than rolling drag-to-reorder yourself.

## Verification checklist

- [ ] Install was explicitly approved.
- [ ] Keyboard equivalent works first — tested with Tab + Arrow keys + Space/Enter.
- [ ] Reorder persists across page refresh (server-side save confirmed).
- [ ] `prefers-reduced-motion: reduce` disables the spring and snaps to target.
- [ ] Touch scroll still works on mobile (no global `touch-action: none`).
- [ ] Drag handle has a visible affordance (icon + cursor change).
- [ ] Lint, typecheck, and tests pass.
