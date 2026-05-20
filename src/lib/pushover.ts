import { prisma } from "./prisma";

export function pushoverStatus() {
  const token = process.env.PUSHOVER_APP_TOKEN?.trim();
  const keys = (process.env.PUSHOVER_USER_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  return {
    enabled: Boolean(token && keys.length),
    token,
    recipientKeys: keys,
    recipientCount: keys.length
  };
}

export async function sendPushoverAlert(input: {
  organizationId: string;
  eventType: string;
  title: string;
  message: string;
  departmentId?: string | null;
  ownerId?: string | null;
  createdById?: string | null;
}) {
  const config = pushoverStatus();
  if (!config.enabled || !config.token) {
    return { sent: false, reason: "pushover_not_configured" };
  }

  const responses = [];
  for (const userKey of config.recipientKeys) {
    try {
      const response = await fetch("https://api.pushover.net/1/messages.json", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: config.token,
          user: userKey,
          title: input.title,
          message: input.message
        })
      });

      const payload = await response.json().catch(() => ({ status: response.status }));
      responses.push({ userKey: `${userKey.slice(0, 4)}...`, ok: response.ok, payload });

      await prisma.notificationLog.create({
        data: {
          organizationId: input.organizationId,
          channel: "pushover",
          eventType: input.eventType,
          recipient: `${userKey.slice(0, 4)}...`,
          title: input.title,
          body: input.message,
          status: response.ok ? "SENT" : "FAILED",
          response: JSON.parse(JSON.stringify(payload)),
          departmentId: input.departmentId ?? undefined,
          ownerId: input.ownerId ?? undefined,
          createdById: input.createdById ?? undefined
        }
      });
    } catch (error) {
      const payload = { error: error instanceof Error ? error.message : "Pushover notification failed." };
      responses.push({ userKey: `${userKey.slice(0, 4)}...`, ok: false, payload });
      await prisma.notificationLog.create({
        data: {
          organizationId: input.organizationId,
          channel: "pushover",
          eventType: input.eventType,
          recipient: `${userKey.slice(0, 4)}...`,
          title: input.title,
          body: input.message,
          status: "FAILED",
          response: payload,
          departmentId: input.departmentId ?? undefined,
          ownerId: input.ownerId ?? undefined,
          createdById: input.createdById ?? undefined
        }
      });
    }
  }

  return { sent: true, responses };
}
