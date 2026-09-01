import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import {
  createChangelogEntry,
  deleteChangelogEntry,
  updateChangelogEntry,
} from "#services/admin/adminChangelogService";
import { type ChangelogType, syncChangelogFromGitHubReleases } from "#services/changelog/index";

import {
  changelogAdminCreateSchema,
  changelogAdminUpdateSchema,
} from "#validators/changelogValidator";

import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "#services/admin/adminAuditService";
import { requireAuthUser } from "#middleware/auth";

import { createSuccessResponse, handleValidationError } from "#lib/errors";

/**
 * Create a new changelog entry (admin only).
 *
 * req.body:
 * - version, title, type and optional release metadata
 *
 * res:
 * - 200 with created entry payload
 *
 * next:
 * - forwards validation/runtime errors to global error handler
 */

export async function createChangelogEntryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = changelogAdminCreateSchema.parse(req.body);

    const created = await createChangelogEntry({
      id: payload.id,
      version: payload.version,
      title: payload.title,
      summary: payload.summary,
      type: payload.type as ChangelogType,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined,
      githubUrl: payload.githubUrl,
      added: payload.added,
      improved: payload.improved,
      fixed: payload.fixed,
      breaking: payload.breaking,
      security: payload.security,
      tags: payload.tags,
      prRefs: payload.prRefs,
    });

    await recordAdminAudit({
      actorId: requireAuthUser(req).id,
      action: ADMIN_AUDIT_ACTIONS.changelogCreate,
      targetType: "ChangelogEntry",
      targetId: created.id,
      metadata: { version: created.version, title: created.title },
    });

    res.json(createSuccessResponse(created, "Changelog entry created successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(handleValidationError(error));
    }

    next(error);
  }
}

/**
 * Update an existing changelog entry by id (admin only).
 *
 * req.params:
 * - id: changelog entry id (required)
 *
 * req.body:
 * - partial changelog entry fields to update
 *
 * res:
 * - 200 with updated entry payload
 *
 * next:
 * - forwards validation/runtime errors to global error handler
 */

export async function updateChangelogEntryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const payload = changelogAdminUpdateSchema.parse(req.body);

    const updated = await updateChangelogEntry(id, {
      version: payload.version,
      title: payload.title,
      summary: payload.summary,
      type: payload.type as ChangelogType | undefined,
      publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined,
      githubUrl: payload.githubUrl,
      added: payload.added,
      improved: payload.improved,
      fixed: payload.fixed,
      breaking: payload.breaking,
      security: payload.security,
      tags: payload.tags,
      prRefs: payload.prRefs,
    });

    await recordAdminAudit({
      actorId: requireAuthUser(req).id,
      action: ADMIN_AUDIT_ACTIONS.changelogUpdate,
      targetType: "ChangelogEntry",
      targetId: id,
      metadata: { fields: Object.keys(payload) },
    });

    res.json(createSuccessResponse(updated, "Changelog entry updated successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(handleValidationError(error));
    }

    next(error);
  }
}

/**
 * Delete a changelog entry by id (admin only).
 *
 * req.params:
 * - id: changelog entry id (required)
 *
 * res:
 * - 200 with deleted id payload
 *
 * next:
 * - forwards runtime errors to global error handler
 */

export async function deleteChangelogEntryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const deleted = await deleteChangelogEntry(id);

    await recordAdminAudit({
      actorId: requireAuthUser(req).id,
      action: ADMIN_AUDIT_ACTIONS.changelogDelete,
      targetType: "ChangelogEntry",
      targetId: id,
    });

    res.json(createSuccessResponse(deleted, "Changelog entry deleted successfully"));
  } catch (error) {
    next(error);
  }
}

/**
 * Manually trigger a sync of missing GitHub releases into the changelog (admin only).
 *
 * res:
 * - 200 with { created, skipped, total } sync summary
 *
 * next:
 * - forwards runtime errors (including a 409 if a sync is already in progress)
 */

export async function syncChangelogReleasesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await syncChangelogFromGitHubReleases();

    await recordAdminAudit({
      actorId: requireAuthUser(req).id,
      action: ADMIN_AUDIT_ACTIONS.changelogSync,
      targetType: "ChangelogEntry",
      metadata: { ...result },
    });

    res.json(createSuccessResponse(result, "Changelog release sync completed successfully"));
  } catch (error) {
    next(error);
  }
}
