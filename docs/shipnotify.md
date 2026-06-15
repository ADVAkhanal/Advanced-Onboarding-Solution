# ShipNotify — Shipment Confirmation Loop

Adapted from the Randel/ShipNotify concept (CSV → QR per shipment → scan to
confirm → notify) to this platform's constraints: no external email sender
(Pushover/in-app replaces nodemailer) and no third-party QR/image service (the
confirm URL must never leave the app — data-scope boundary). The packing slip
and its QR ship physically in the box; the recipient scans to confirm receipt on
a public page, and confirmation alerts the shop internally.

## Flow

```
Shipment Board (/erp/shipping)        "Notify" → POST /api/erp/shipping/{id}/notify
  │  mint opaque confirm token (144-bit), status PLANNED → SHIPPED, notifiedAt set
  │  Pushover alert to shop staff with the recipient confirm URL  (idempotent)
  ▼
Packing slip  (/erp/shipping/{id}/packing-slip, erp:manage, print-CSS)
  │  embeds the confirm QR (src/lib/qr.ts → inline SVG) → printed, ships in the box
  ▼
Recipient scans QR → public page  /s/{token}   (no login)
  │  enters name → POST /api/public/ship-confirm/{token}
  ▼
Shipment confirmed                    confirmedAt + confirmedByName, status DELIVERED
     Pushover "received" alert back to the shop  (idempotent — re-scan is a no-op)
```

## Why a hand-rolled QR encoder

`src/lib/qr.ts` is a dependency-free QR generator (byte mode, ECC level M,
versions 1–10) that renders to inline SVG. It exists because:

1. The platform avoids extra runtime dependencies for rendering (cf. the
   print-CSS PDFs — no PDF library either).
2. Sending the payload to an external QR/image service would breach the
   data-scope boundary, even though the token itself is opaque.

A confirm URL is well under the ~213-byte v10-M ceiling; longer payloads throw.

## Security & data scope

- The confirm token is 144 bits of CSPRNG output (`randomBytes(18)`,
  base64url) — enumeration is infeasible, so the public endpoint needs no auth.
- The public page and API expose **only** the shipment number and confirmation
  state. No customer, address, order, or operational data is returned.
- Confirmation is idempotent (`SHIP-409`/already-confirmed returns the existing
  state); a bad/expired token returns `SHIP-404`.
- Both public surfaces are allow-listed in `middleware.ts` (`/s`,
  `/api/public/ship-confirm`); everything else still requires a session.

## Permissions

| Action                        | Permission   |
|-------------------------------|--------------|
| Notify / re-notify, slip      | `erp:manage` |
| View the shipment board       | `erp:view`   |
| Confirm receipt (public)      | none (token) |

## Environment variables

| Variable             | Purpose                                             | Default            |
|----------------------|-----------------------------------------------------|--------------------|
| `APP_URL`            | Absolute base URL for confirm links / packing-slip QR | request host    |
| `PUSHOVER_APP_TOKEN` | Enables internal alerts (shared with the platform)  | _(unset → logged only)_ |
| `PUSHOVER_USER_KEYS` | Comma-separated recipient keys                      | _(unset)_          |

If `APP_URL` is unset the link is derived from the request's forwarded host —
set it explicitly on Railway so printed QR codes always point at the public host.

## Error codes

| Code      | Meaning                                              |
|-----------|------------------------------------------------------|
| `SHIP-404`| Shipment / confirm token not found or expired        |
| `SHIP-409`| Already confirmed (idempotent — not a hard error)    |
| `SHIP-422`| Shipment notification data incomplete                |

See [error-codes.md](error-codes.md) for the full catalog.
