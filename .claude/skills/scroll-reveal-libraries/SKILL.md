---
name: scroll-reveal-libraries
description: Add lightweight reveal-on-scroll behavior to long Shop-Management pages — reports, audit logs, training course pages, SOP documents, long forms. Use when a long-scroll surface needs progressive disclosure to feel less overwhelming, without adding a heavy scroll runtime.
---

# Scroll Reveal Libraries (Shop-Management)

Guidance for progressive reveal on long-scroll pages. Strong bias toward `IntersectionObserver` over any library.

## When to use this skill

- Reports under `src/app/(platform)/reports/` — financials, KPIs, attendance summaries.
- Audit-style lists where rows reveal as they enter the viewport.
- SOP and training course pages — multi-section long-form content.
- Onboarding flows with sequential reveals.
- Director/Executive dashboards with stacked KPI/chart sections.

## When NOT to use this skill

- Above-the-fold content — it should always be visible immediately.
- Tables — reveal-per-row hurts scanning. Use a static table.
- Forms — never hide form fields behind a scroll trigger.
- Modals, drawers, dialogs — content there is already gated.
- Print/PDF report views — reveal animations have no meaning in print.

## Project context

- Next.js 14 App Router, React 18, TypeScript.
- No scroll library currently installed and none needed.
- **`src/app/globals.css` already provides reveal primitives** — `.motion-fade-up`, `.motion-fade-in`, `.motion-slide-in`, `.motion-pop`, and the `.motion-stagger` parent pattern (auto-staggers up to 6 children at 60ms apart). For most "reveal a section as it scrolls into view" needs, these classes plus an IntersectionObserver toggle are sufficient.
- ERP users often scan reports quickly — reveal must be subtle and fast, never theatrical.

## Workflow

1. **Default approach: IntersectionObserver in a small client component.** Create `src/components/reveal.tsx` (if it doesn't exist) — a `"use client"` wrapper that toggles a `data-visible` attribute when the element intersects the viewport. Internally, when visible, apply one of the existing `motion-fade-up` / `motion-stagger` classes from `globals.css` rather than coding new keyframes.
2. **Reveal once, then leave alone.** Disconnect the observer after the first intersection — don't re-hide on scroll-out, that's distracting in an ERP.
3. **Threshold:** 0.1 to 0.2 of the element. Don't wait until fully visible.
4. **For grids of cards/sections**, just wrap the parent in `class="motion-stagger"` — the stagger pattern in `globals.css` already handles delays for the first 6 children.
5. **Server components stay server components.** Only the wrapper that observes is a client component; its children can still be RSC output.

## Safe implementation rules

- The reveal must not gate functionality. If JS is disabled or the observer fails, the content must still be readable (use `noscript`-friendly defaults — opacity 1 unless the observer is mounted).
- `prefers-reduced-motion` is already globally honored in `globals.css` (animations clamped to 1ms). Don't add a second handler.
- Never apply reveal to interactive elements that may need to be clicked before they're "revealed" (e.g., a sticky toolbar).
- Don't observe more than ~50 elements on a page. If you'd exceed that, the design probably needs pagination instead of reveal.
- Disconnect the observer in the cleanup effect to avoid memory leaks.

## Dependency rules

- Allowed: native `IntersectionObserver`, Tailwind utilities, CSS transitions.
- Discouraged: `aos`, `react-reveal`, `react-scroll-reveal`, `react-intersection-observer` (the npm helper). The native API in a 20-line component is enough.
- Disallowed: `gsap` ScrollTrigger, `locomotive-scroll`, `lenis`. They override native scroll behavior — bad for an ERP where users use Home/End/Page Down to navigate quickly.

## Verification checklist

- [ ] Content is visible (not hidden) before JS hydrates — verified by disabling JS in devtools.
- [ ] `prefers-reduced-motion: reduce` skips the animation entirely.
- [ ] Keyboard scrolling (Page Down, End, arrow keys) reveals content the same way mouse scrolling does.
- [ ] Print preview shows all content immediately.
- [ ] No reveal applied to tables, forms, or critical above-the-fold content.
- [ ] No new dependency added.
- [ ] `npm run typecheck` passes.
