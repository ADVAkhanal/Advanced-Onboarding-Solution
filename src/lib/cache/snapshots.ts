import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Operations Hub caching. Three tiers, cheapest first:
 *
 *  1. Browser/HTTP cache — handled at the route/response level (not here).
 *  2. Server memory  — `getMemo()` for low-risk, frequently-read, short-TTL
 *     values (module counts, readiness flags). Per-instance, lost on restart.
 *  3. Database-backed — `getOrCreateSnapshot()` for expensive rollups and
 *     AI summaries that must survive restarts and be shared across instances.
 *
 * `sourceHash` is the key to cheap correctness: callers compute a stable hash
 * of the underlying data; if it matches the stored hash and the row is not
 * expired, the cached value is returned WITHOUT recomputing (and, for AI
 * summaries, WITHOUT calling the model). Writes invalidate by entity, never
 * globally, so one shipment change does not blow away every rollup.
 */

// ---- stable hashing ----
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Deterministic, order-independent SHA-256 of any JSON-serialisable value. */
export function stableHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

// ---- server memory tier ----
type MemoEntry = { value: unknown; expiresAt: number };
const memo = new Map<string, MemoEntry>();

export async function getMemo<T>(key: string, compute: () => Promise<T> | T, ttlMs: number): Promise<T> {
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;
  const value = await compute();
  memo.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/** Drop memory-cache entries (all, or those whose key starts with `prefix`). */
export function clearMemo(prefix?: string): void {
  if (!prefix) {
    memo.clear();
    return;
  }
  for (const key of memo.keys()) if (key.startsWith(prefix)) memo.delete(key);
}

// ---- database-backed tier ----
type SnapshotArgs<T> = {
  organizationId: string;
  key: string;
  compute: () => Promise<T>;
  ttlMinutes?: number;
  entityType?: string | null;
  entityId?: string | null;
  sourceHash?: string;
  createdById?: string | null;
  force?: boolean;
};

export type SnapshotResult<T> = { data: T; cached: boolean; computedAt: Date };

export async function getOrCreateSnapshot<T>(args: SnapshotArgs<T>): Promise<SnapshotResult<T>> {
  const existing = await prisma.computedSnapshot.findUnique({
    where: { organizationId_snapshotKey: { organizationId: args.organizationId, snapshotKey: args.key } }
  });

  const now = new Date();
  const notExpired = !existing?.expiresAt || existing.expiresAt > now;
  const hashMatches = args.sourceHash === undefined || existing?.sourceHash === args.sourceHash;
  if (!args.force && existing && notExpired && hashMatches) {
    return { data: existing.dataJson as T, cached: true, computedAt: existing.computedAt };
  }

  const data = await args.compute();
  const expiresAt = args.ttlMinutes ? new Date(now.getTime() + args.ttlMinutes * 60_000) : null;
  const payload = {
    dataJson: data as unknown as Prisma.InputJsonValue,
    sourceHash: args.sourceHash ?? null,
    expiresAt,
    entityType: args.entityType ?? null,
    entityId: args.entityId ?? null,
    computedAt: now
  };
  const saved = await prisma.computedSnapshot.upsert({
    where: { organizationId_snapshotKey: { organizationId: args.organizationId, snapshotKey: args.key } },
    create: { organizationId: args.organizationId, snapshotKey: args.key, createdById: args.createdById ?? null, ...payload },
    update: payload
  });
  return { data, cached: false, computedAt: saved.computedAt };
}

/** Force a recompute + store, ignoring any cached value. */
export async function refreshSnapshot<T>(args: Omit<SnapshotArgs<T>, "force">): Promise<SnapshotResult<T>> {
  return getOrCreateSnapshot({ ...args, force: true });
}

/** Read a snapshot without computing (returns null if missing or expired). */
export async function readSnapshot<T>(organizationId: string, key: string): Promise<SnapshotResult<T> | null> {
  const row = await prisma.computedSnapshot.findUnique({
    where: { organizationId_snapshotKey: { organizationId, snapshotKey: key } }
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt <= new Date()) return null;
  return { data: row.dataJson as T, cached: true, computedAt: row.computedAt };
}

/** Event-driven invalidation: drop snapshots tied to one entity. */
export async function invalidateSnapshotsForEntity(
  organizationId: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const res = await prisma.computedSnapshot.deleteMany({ where: { organizationId, entityType, entityId } });
  return res.count;
}

/** Invalidate a single snapshot by key. */
export async function invalidateSnapshot(organizationId: string, key: string): Promise<void> {
  await prisma.computedSnapshot.deleteMany({ where: { organizationId, snapshotKey: key } });
}
