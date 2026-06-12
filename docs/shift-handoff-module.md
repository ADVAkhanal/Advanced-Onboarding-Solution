# Shift Handoff Module

End-of-shift handoff log — reimagines the standalone "Production Shift Handoff"
app (`ADVAkhanal/Shift-Handoff`, Next.js/Prisma/Entra/Nodemailer) as a native
module inside the platform's auth, audit, and notification stack.

> Working tree: `C:/Users/Akhanal/Documents/Shop Management/`.

## Data model (migration `20260602150000_shift_handoff`, additive)

- `ShiftHandoff` — shift (DAY/EVENING/NIGHT), shiftDate, operators (free-text
  names), general notes, submittedByName. Org-scoped + audited.
- `ShiftHandoffEntry` — one per machine: machineCode (loose link to
  `Machine.code`), woNumber, status (RUNNING/DOWN/SETUP/IDLE/COMPLETE),
  partsMade, partsTarget, notes.

Source-app fidelity: the original `Handoff` / `HandoffEntry` / `Shift` /
`MachineStatus` shapes are preserved; Entra SSO + SMTP are replaced by platform
session auth + Pushover.

## Behavior

- **Submit** (`POST /api/shift-handoff`, permission `erp:view` — shop-floor
  action): creates handoff + entries in one transaction, validated and
  data-boundary checked, audit-logged.
- **Maintenance sync:** entries reporting **DOWN** set the matching maintenance
  `Machine.status = down`; **RUNNING** clears a previous `down`. SETUP / IDLE /
  COMPLETE are production states and leave the machine record alone.
- **Supervisor alert:** when Pushover is configured (`PUSHOVER_*`), each
  submission sends an alert summarizing entry count + any DOWN machines
  (logged to `NotificationLog`). Replaces the source app's Outlook/Teams notify.

## UI

`/shift-handoff` — KPI strip (handoffs 7d, DOWN reports, parts made/target,
attainment %), a dynamic multi-machine submit form (machine picklist comes from
the maintenance roster), and the recent handoff log grouped by shift/date.
Nav: **Shift Handoff** (after Maintenance).

## Verification

```bash
npm run lint && npm run typecheck && npm test
npx next build     # /shift-handoff + /api/shift-handoff compile
```

Smoke: `/shift-handoff` → submit a handoff with one RUNNING and one DOWN entry →
log appears, KPIs update → `/maintenance` shows the DOWN machine red → submit a
follow-up RUNNING entry for it → machine returns to running.
