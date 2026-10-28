import { adminHandler, deleteRequestInput } from "#controllers/admin/adminRequestHandler";
import {
  createRoadmapFeature,
  deleteRoadmapFeature,
  updateRoadmapFeature,
} from "#services/admin/adminRoadmapService";
import { type RoadmapStatus } from "#services/roadmapService";

import { roadmapAdminCreateSchema, roadmapAdminUpdateSchema } from "#validators/roadmapValidator";
import { adminIdParamSchema, adminReasonOnlySchema } from "#validators/admin/adminCommonValidator";

import { ADMIN_AUDIT_ACTIONS, recordAdminAudit } from "#services/admin/adminAuditService";

const parseDateInput = (val?: string | null) =>
  val === undefined ? undefined : val === null ? null : new Date(val);

/**
 * Create a new roadmap feature (admin only).
 *
 * req.body:
 * - title, description, status and optional roadmap metadata
 *
 * res:
 * - 201 with created feature payload; 409 for an id already in use (P2002, central mapper)
 */

export const createRoadmapFeatureController = adminHandler(async ({ req, res, actorId }) => {
  const payload = roadmapAdminCreateSchema.parse(req.body);

  const created = await createRoadmapFeature({
    id: payload.id,
    title: payload.title,
    description: payload.description,
    status: payload.status as RoadmapStatus,
    eta: payload.eta,
    tags: payload.tags,
    fullDescription: payload.fullDescription,
    whyItMatters: payload.whyItMatters,
    timeline: payload.timeline,
    createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
    startedAt: parseDateInput(payload.startedAt),
    completedAt: parseDateInput(payload.completedAt),
    completedQuarter: payload.completedQuarter,
    details: payload.details,
  });

  await recordAdminAudit({
    actorId,
    action: ADMIN_AUDIT_ACTIONS.roadmapCreate,
    targetType: "RoadmapFeature",
    targetId: created.id,
    reason: payload.reason,
    metadata: { title: created.title, status: created.status },
  });

  res.status(201);
  return created;
}, "Roadmap feature created successfully");

/**
 * Update an existing roadmap feature by id (admin only).
 *
 * req.params:
 * - id: roadmap feature id (required)
 *
 * req.body:
 * - partial roadmap feature fields to update
 *
 * res:
 * - 200 with updated feature payload; `eta: null` clears the ETA
 */

export const updateRoadmapFeatureController = adminHandler(async ({ req, actorId }) => {
  const { id } = adminIdParamSchema.parse(req.params);
  const payload = roadmapAdminUpdateSchema.parse(req.body);

  const updated = await updateRoadmapFeature(id, {
    title: payload.title,
    description: payload.description,
    status: payload.status as RoadmapStatus | undefined,
    eta: payload.eta,
    tags: payload.tags,
    fullDescription: payload.fullDescription,
    whyItMatters: payload.whyItMatters,
    timeline: payload.timeline,
    startedAt: parseDateInput(payload.startedAt),
    completedAt: parseDateInput(payload.completedAt),
    completedQuarter: payload.completedQuarter,
    details: payload.details,
  });

  await recordAdminAudit({
    actorId,
    action: ADMIN_AUDIT_ACTIONS.roadmapUpdate,
    targetType: "RoadmapFeature",
    targetId: id,
    reason: payload.reason,
    // Records which fields were touched, not their values: a roadmap body can be several
    // kilobytes of prose and the audit table is not a revision history.
    metadata: { fields: Object.keys(payload).filter((key) => key !== "reason") },
  });

  return updated;
}, "Roadmap feature updated successfully");

/**
 * Delete a roadmap feature by id (admin only).
 *
 * req.params:
 * - id: roadmap feature id (required)
 *
 * req.body or query:
 * - reason: audit reason, required (V-081)
 *
 * res:
 * - 200 with deleted id payload
 */

export const deleteRoadmapFeatureController = adminHandler(async ({ req, actorId }) => {
  const { id } = adminIdParamSchema.parse(req.params);
  const { reason } = adminReasonOnlySchema.parse(deleteRequestInput(req));

  const deleted = await deleteRoadmapFeature(id);

  await recordAdminAudit({
    actorId,
    action: ADMIN_AUDIT_ACTIONS.roadmapDelete,
    targetType: "RoadmapFeature",
    targetId: id,
    reason,
  });

  return deleted;
}, "Roadmap feature deleted successfully");
