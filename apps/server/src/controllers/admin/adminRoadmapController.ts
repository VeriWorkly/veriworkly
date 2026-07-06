import { z } from "zod";
import { Request, Response, NextFunction } from "express";

import {
  createRoadmapFeature,
  deleteRoadmapFeature,
  updateRoadmapFeature,
} from "#services/admin/adminRoadmapService";
import { type RoadmapStatus } from "#services/roadmapService";

import { roadmapAdminCreateSchema, roadmapAdminUpdateSchema } from "#validators/roadmapValidator";

import { createSuccessResponse, handleValidationError } from "#lib/errors";

/**
 * Create a new roadmap feature (admin only).
 *
 * req.body:
 * - title, description, status and optional roadmap metadata
 *
 * res:
 * - 200 with created feature payload
 *
 * next:
 * - forwards validation/runtime errors to global error handler
 */

export async function createRoadmapFeatureController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const payload = roadmapAdminCreateSchema.parse(req.body);

    const created = await createRoadmapFeature({
      id: payload.id,
      title: payload.title,
      description: payload.description,
      status: payload.status as RoadmapStatus,
      eta: payload.eta ?? undefined,
      tags: payload.tags,
      fullDescription: payload.fullDescription,
      whyItMatters: payload.whyItMatters,
      timeline: payload.timeline,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
      startedAt: payload.startedAt ? new Date(payload.startedAt) : undefined,
      completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
      completedQuarter: payload.completedQuarter,
      details: payload.details,
    });

    res.json(createSuccessResponse(created, "Roadmap feature created successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(handleValidationError(error));
    }

    next(error);
  }
}

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
 * - 200 with updated feature payload
 *
 * next:
 * - forwards validation/runtime errors to global error handler
 */

export async function updateRoadmapFeatureController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const payload = roadmapAdminUpdateSchema.parse(req.body);

    const parseDateInput = (val?: string | null) =>
      val === undefined ? undefined : val === null ? null : new Date(val);

    const updated = await updateRoadmapFeature(id, {
      title: payload.title,
      description: payload.description,
      status: payload.status as RoadmapStatus | undefined,
      eta: payload.eta ?? undefined,
      tags: payload.tags,
      fullDescription: payload.fullDescription,
      whyItMatters: payload.whyItMatters,
      timeline: payload.timeline,
      startedAt: parseDateInput(payload.startedAt),
      completedAt: parseDateInput(payload.completedAt),
      completedQuarter: payload.completedQuarter,
      details: payload.details,
    });

    res.json(createSuccessResponse(updated, "Roadmap feature updated successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(handleValidationError(error));
    }

    next(error);
  }
}

/**
 * Delete a roadmap feature by id (admin only).
 *
 * req.params:
 * - id: roadmap feature id (required)
 *
 * res:
 * - 200 with deleted id payload
 *
 * next:
 * - forwards runtime errors to global error handler
 */

export async function deleteRoadmapFeatureController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;

    const deleted = await deleteRoadmapFeature(id);

    res.json(createSuccessResponse(deleted, "Roadmap feature deleted successfully"));
  } catch (error) {
    next(error);
  }
}
