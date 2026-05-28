---
name: modern-web-design
description: Apply modern, accessible design principles to Shop-Management ERP screens — dashboards, KPI cards, data tables, forms, modals, empty states, reports. Use when designing or refining UI layout, typography, spacing, color usage, hierarchy, or visual polish for any of the platform/admin/manager/director/employee views.
---

# Modern Web Design (Shop-Management)

Guidance for tasteful, accessible UI work inside the Shop-Management Next.js + Tailwind app. Bias toward clarity over decoration — this is an internal ERP, not a marketing site.

## When to use this skill

- Designing or refining any screen under `src/app/(platform)/` (dashboard, tickets, approvals, payroll, reports, sop, training, erp, admin, etc.).
- Building or refactoring shared components in `src/components/` (`dashboard-view`, `kpi-card`, `data-table`, `app-shell`, `modal`, `form-field`, `empty-state`, `toolbar`, `module-workbench`).
- Reviewing visual hierarchy, spacing, typography, color usage, or accessibility on existing pages.
- Producing screen mockups, layout proposals, or design audits for executive/director/manager/employee variants.

## When NOT to use this skill

- Backend/API changes, Prisma schema work, business logic (`src/lib/`).
- Authentication, billing, inventory, sales, or database logic.
- Performance refactors that don't change visual output.
- 3D, parallax, heavy motion — defer to `lightweight-3d-effects`, `motion-framer`, or skip.

## Project context

- Framework: Next.js 14 (App Router, RSC + client components), React 18, TypeScript.
- Styling: **hybrid model — primary layer is custom CSS classes in `src/app/globals.css`** (`.card`, `.kpi`, `.button`, `.empty-state`, `.toolbar`, `.modal`, `.pill`, `.nav-item`, etc.). Tailwind 3 is wired up and usable, but the existing components use class names from `globals.css` first. **Always read `globals.css` before adding new styles** — there's a strong chance the class you need already exists.
- Design tokens are CSS custom properties in `globals.css` `:root` (`--blue`, `--cyan`, `--green`, `--amber`, `--red`, `--ink`, `--muted`, `--card`, `--bg`, `--soft`, `--line`, `--shadow`). Mirror tokens exist in `tailwind.config.ts` (`cleanops.*` colors, `borderRadius.card = 8px`).
- Icons: `lucide-react` only — do not introduce another icon set.
- Four-tier RBAC: User → Manager → Director → Global Admin. Dashboard variants already exist (`executive | director | manager | employee`).
- Data scope boundary: no CUI/PCI/PHI/banking/credentials in UI. Treat all visible data as operational metadata only.

## Workflow

1. **Read the touched component file first.** Identify existing Tailwind tokens, layout primitives, and the variant prop pattern. Do not invent new color tokens unless extending `tailwind.config.ts` with the user's approval.
2. **Map the screen to a hierarchy:** primary action, primary metric, secondary information, tertiary information. ERP users scan — they don't read.
3. **Apply spacing scale first, color second.** Use Tailwind's spacing scale (`gap-2/4/6`, `p-4/6`) consistently before reaching for color emphasis.
4. **Color usage:**
   - `cleanops-navy` for primary text, headers.
   - `cleanops-blue` for primary actions and links.
   - `cleanops-green` for healthy/positive states.
   - `cleanops-amber` for warnings, pending.
   - `cleanops-red` for blockers, work stoppages, urgent.
   - Never use color as the only signal — pair with icon + text.
5. **Typography:** lean on Tailwind defaults; use `font-medium`/`font-semibold` for emphasis instead of size jumps when possible.
6. **Tables:** keep dense but scannable. Sticky headers when row count > 15. Right-align numeric columns. Use `tabular-nums` for amounts/counts.
7. **Forms:** label above input, error below, helper text muted. Group related fields with `fieldset`. Disable the submit button while pending; never hide it.
8. **Empty states:** reuse `empty-state.tsx`. Explain *why* it's empty and offer the next action.

## Safe implementation rules

- Do not install new dependencies.
- Do not introduce a CSS-in-JS library, styled-components, Emotion, or a competing utility framework. Extend `globals.css` or use Tailwind utilities — those two are the sanctioned paths.
- Do not change `tailwind.config.ts` without explicit user approval — extending colors is a token decision, not a layout decision.
- Preserve every existing variant prop (`executive | director | manager | employee`) and RBAC-conditioned render path.
- All new interactive elements must have a visible focus ring (Tailwind `focus-visible:ring-2`).
- Respect `prefers-reduced-motion` — never make motion mandatory for state transitions.
- Maintain a minimum contrast ratio of 4.5:1 for body text, 3:1 for large text (WCAG AA).

## Dependency rules

- Allowed: `tailwindcss`, `lucide-react`, `next/link`, `next/image`, existing component primitives.
- Disallowed without approval: any new UI library (shadcn, Radix, MUI, Mantine, Chakra, Bootstrap), CSS frameworks, icon sets, or font hosting.
- If a primitive is genuinely missing, prefer to build it inside `src/components/` using Tailwind.

## Verification checklist

- [ ] Page renders in `executive`, `director`, `manager`, and `employee` variants where applicable.
- [ ] Keyboard navigation works: Tab order is logical, focus ring visible, Escape closes modals.
- [ ] All interactive elements have an accessible name (visible label, `aria-label`, or `aria-labelledby`).
- [ ] No color-only signaling — icon + text pairs with status colors.
- [ ] Layout holds at 1280px, 1024px, and 768px; gracefully degrades on mobile.
- [ ] `npm run lint` and `npm run typecheck` pass.
- [ ] No new dependencies added unless explicitly approved.
