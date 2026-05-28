---
name: lottie-animations
description: Add Lottie vector animations to Shop-Management empty states, loaders, success/failure confirmations, and onboarding moments. Use when a static icon or spinner would be too cold — typically for empty inboxes, completion celebrations, blocking errors, or training-module reward states.
---

# Lottie Animations (Shop-Management)

Lottie is reserved for *moments that deserve a small visual reward or empathy* — not for ambient decoration.

## When to use this skill

- `src/components/empty-state.tsx` enhancements — when a column or list is genuinely empty (no tickets, no approvals, no time-off requests).
- Success confirmations after long-running actions: payroll submitted, FAIR generated, training course completed.
- Blocking error/empty data states that need to feel less harsh.
- Onboarding completion in `src/app/(platform)/onboarding/`.
- Training/Assessments module completion (`src/app/(platform)/training/`) — quiz completion, badge earned.

## When NOT to use this skill

- Buttons, hover states, toolbars — use CSS transitions instead.
- Inline status indicators in tables — use static `lucide-react` icons.
- Anywhere a Lottie would loop indefinitely while the user is working — distracting.
- Login screen, dashboard above-the-fold — keep load fast.
- Print/PDF outputs.

## Project context

- Next.js 14, React 18, TypeScript. Server components are the default.
- `lucide-react` is the icon system — don't replace existing icons with Lottie.
- **`src/app/globals.css` already includes a `.motion-spinner` class and `.motion-shimmer-bar` skeleton loader.** Use these for *generic* loading/empty/pending states before reaching for Lottie. Reserve Lottie for **emotionally meaningful** moments: training-course completion, payroll submitted, FAIR generated, certificate earned.
- No animation library currently installed.
- Lottie files (`.json` or `.lottie`) can be heavy (50KB–500KB each). Treat them like images: lazy-load and reuse.

## Workflow

1. **Confirm the moment deserves a Lottie.** If you can't articulate the emotion (empathy, celebration, reassurance), use a static icon instead.
2. **Pick one player.** Recommend `@lottiefiles/dotlottie-react` (smaller, supports the `.lottie` compressed format) or `lottie-react`. Propose to the user before installing — see Dependency rules.
3. **Store assets** in `public/lottie/` (one file per state). Keep filenames descriptive: `empty-tickets.lottie`, `payroll-submitted.lottie`, `training-complete.lottie`.
4. **Wrap in a small client component** under `src/components/lottie/` — accepts `src`, `loop`, `autoplay`, `aria-label`. Default `loop: false` for success/celebration; `loop: true` only for ambient empty states.
5. **Always provide a visible fallback** (a `lucide-react` icon or static SVG) for: SSR render, JS-disabled, animation file failed to load, `prefers-reduced-motion`.
6. **Cap size:** any Lottie file > 200KB needs a justification. Compress on LottieFiles.com or export from After Effects with optimized settings.

## Safe implementation rules

- Lazy-load via `next/dynamic` with `ssr: false` so the player isn't in the main bundle.
- `prefers-reduced-motion: reduce` → render the static fallback, do not play the animation.
- Every Lottie needs an `aria-label` that describes what it represents (e.g., "No tickets in this queue"). Decorative-only Lotties still need a fallback for screen readers — usually `aria-hidden="true"` paired with adjacent descriptive text.
- Never autoplay a looping Lottie above the fold on the dashboard.
- Don't ship Lottie files containing branding, logos, or third-party content without confirming the license.
- Do not load Lottie JSON from a remote CDN at runtime — store under `public/lottie/` so the asset is cache-controlled and ITAR/data-boundary-safe (no external traffic).

## Dependency rules

- Propose, don't install: `@lottiefiles/dotlottie-react` (recommended) or `lottie-react`. Wait for user approval before running `npm install`.
- Disallowed without approval: pulling Lottie at runtime from `lottiefiles.com` CDN, `lottie-web` direct (heavier), `react-lottie` (unmaintained).
- Asset license: only use Lottie files from sources with clear permissive licenses (LottieFiles Free, in-house authored, or commissioned). Do not use scraped or unattributed `.json` files.

## Verification checklist

- [ ] Static fallback renders if JS is disabled or the player fails.
- [ ] `prefers-reduced-motion: reduce` shows the static fallback instead of playing.
- [ ] `aria-label` describes the state to screen readers.
- [ ] Lottie file < 200KB (or justified inline if larger).
- [ ] No looping Lottie above the fold on any dashboard.
- [ ] Asset stored locally under `public/lottie/`, not loaded from a remote CDN.
- [ ] `npm run lint` and `npm run typecheck` pass.
