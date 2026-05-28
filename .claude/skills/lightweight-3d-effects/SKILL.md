---
name: lightweight-3d-effects
description: Apply lightweight CSS-only 3D effects to Shop-Management cards and badges — subtle tilt on KPI cards, pressed-depth on buttons, layered shadow on hover. Use only for low-cost depth cues that improve hierarchy, never for decorative 3D scenes or heavy WebGL.
---

# Lightweight 3D Effects (Shop-Management)

CSS transforms, layered shadows, and (sparingly) `vanilla-tilt.js`. No WebGL. No Three.js. No Babylon.

## When to use this skill

- `kpi-card.tsx` — subtle hover lift (~2–4px translate-y + shadow change).
- Primary action buttons — pressed state with `translate-y-0.5` + reduced shadow.
- Empty/celebration cards — slight tilt on hover for visual interest.
- Badge or status pill stacks — z-layered shadow to indicate depth.
- Dashboard "stat" tiles in `dashboard-view.tsx` — layered shadow on hover.

## When NOT to use this skill

- Hero/marketing surfaces with full 3D scenes — out of scope; this is an ERP.
- Anything requiring WebGL (`three.js`, `babylon.js`, `playcanvas`) — never appropriate here.
- Forms, tables, modals — depth cues distract from data scanning.
- Print/PDF outputs.
- Charts (the shadow would compete with chart marks).

## Project context

- Tailwind 3 is available for one-off utilities, but the primary card/button system lives in `src/app/globals.css` (`.card`, `.button`, `.kpi`, etc.).
- **`.card` and `a.card`/`.card-interactive` already have a 2px hover lift + softened shadow** in `globals.css`. Don't duplicate it; build on top.
- `--shadow: 0 18px 50px rgba(10, 27, 50, 0.08)` is the base card shadow token; reuse via `var(--shadow)`.
- `borderRadius.card = 8px` (Tailwind) mirrors the `globals.css` `border-radius: 8px` on `.card` — preserve it.
- ERP context: depth is a hierarchy tool, not decoration. A KPI card hovering up by 2px tells the user "this is the active hovered card." A 10° tilt tells them "this is a marketing landing page" — wrong context.

## Workflow

1. **Default approach: Tailwind utility classes.** No JS needed.
   - Hover lift: `transition-transform hover:-translate-y-0.5 hover:shadow-md`
   - Pressed: `active:translate-y-0 active:shadow-sm`
   - Subtle tilt on hover: use arbitrary values: `hover:[transform:perspective(600px)_rotateX(2deg)]` — keep angles ≤ 3°.
2. **Layered shadow for depth:** combine two `box-shadow` values via Tailwind arbitrary class `shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_8px_rgba(0,0,0,0.04)]`.
3. **For interactive parallax/tilt on a single card** (rare): consider `vanilla-tilt.js` (5KB) wrapped in a `"use client"` component. Cap max tilt at 4°. Disable on touch.
4. **Always cap angles and offsets:**
   - Rotate: ≤ 3°
   - Translate: ≤ 4px
   - Shadow blur: ≤ 12px
5. **Test on a high-contrast theme.** Shadows that depend on subtle alpha may disappear on dark/high-contrast — provide a border fallback.

## Safe implementation rules

- No WebGL, no Three.js, no Canvas-based 3D. If a task asks for "3D" beyond CSS, escalate back to the user before installing anything.
- `prefers-reduced-motion: reduce` → disable transforms entirely, keep only the shadow change for hover feedback.
- Never apply tilt or rotate to text content — only to the containing card or button.
- Don't apply 3D effects to elements that are actively being interacted with (e.g., a focused form field).
- Maintain hit-test reliability: a rotated card should still be clickable in its visual bounds (avoid `transform-style: preserve-3d` quirks on children).
- Test with keyboard focus, not just mouse hover — the depth cue should fire on `:focus-visible` too where appropriate.

## Dependency rules

- Allowed (default): Tailwind utilities, CSS transforms, CSS box-shadow.
- Propose, don't install: `vanilla-tilt.js` (only if interactive parallax tilt is a real requirement, not nice-to-have). Bundle cost: ~5KB.
- Disallowed without approval: `three.js`, `@react-three/fiber`, `@react-three/drei`, `babylonjs`, `playcanvas`, `zdog`, `vanta.js`. These are out of scope for an ERP.

## Verification checklist

- [ ] No new heavy dependency installed (Three, Babylon, etc.).
- [ ] Rotate angles ≤ 3°, translate ≤ 4px, shadow blur ≤ 12px.
- [ ] `prefers-reduced-motion: reduce` removes transforms (shadow change may remain).
- [ ] Cards remain clickable in their visual bounds after transform.
- [ ] Focus ring stays visible on `:focus-visible` even with the transform applied.
- [ ] No text content has rotation or perspective applied directly.
- [ ] Lint and typecheck pass.
