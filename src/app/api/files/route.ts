import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, HttpError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { uploadRules } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("file:upload");
    const formData = await request.formData();
    const file = formData.get("file");
    const safeUse = String(formData.get("safeUse") ?? "internal-management");
    const departmentId = formData.get("departmentId") ? String(formData.get("departmentId")) : undefined;

    if (!(file instanceof File)) {
      throw new HttpError(422, "A file upload is required.", "file_required");
    }

    if (!uploadRules.allowedMimeTypes.includes(file.type)) {
      throw new HttpError(415, "This file type is not allowed.", "file_type_blocked");
    }

    if (file.size > uploadRules.maxBytes) {
      throw new HttpError(413, "This file is larger than the configured upload limit.", "file_too_large");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const extension = path.extname(file.name).toLowerCase();
    const storageKey = `${user.organizationId}/${randomUUID()}${extension}`;
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
    const targetPath = path.join(uploadRoot, storageKey);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes, { flag: "wx" });

    const metadata = await prisma.fileMetadata.create({
      data: {
        organizationId: user.organizationId,
        originalName: file.name,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        checksum,
        uploadedById: user.id,
        safeUse,
        departmentId,
        ownerId: user.id,
        createdById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "file.upload",
      entityType: "file_metadata",
      entityId: metadata.id,
      departmentId,
      ownerId: user.id,
      after: { id: metadata.id, originalName: metadata.originalName, mimeType: metadata.mimeType, sizeBytes: metadata.sizeBytes, safeUse }
    });

    return ok({ file: metadata }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
